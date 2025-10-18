import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { glob } from 'glob';
import { logger } from '../utils/logger.js';
import { config } from '../config.js';
import { todoManager, Todo } from '../utils/todo-manager.js';

const execAsync = promisify(exec);

interface ToolCallResult {
  success: boolean;
  result?: string;
  error?: string;
}

// Safe commands whitelist
const SAFE_COMMANDS = ['ls', 'pwd', 'find', 'cat', 'grep', 'head', 'tail', 'wc', 'file', 'stat'];

export async function handleReadFile(filePath: string, projectRoot: string): Promise<ToolCallResult> {
  try {
    const absolutePath = join(projectRoot, filePath);
    const content = await readFile(absolutePath, 'utf-8');

    // Limit content size to 20KB to stay under 250K token budget
    const maxSize = 20000;
    const truncated = content.length > maxSize;
    const result = truncated ? content.substring(0, maxSize) + '\n\n[...truncated]' : content;

    logger.debug(`Read file: ${filePath} (${content.length} chars${truncated ? ', truncated' : ''})`);
    return {
      success: true,
      result // No prefix to save tokens
    };
  } catch (error: any) {
    logger.debug(`Error reading file ${filePath}:`, error);
    return {
      success: false,
      error: 'File not found' // Compressed error message
    };
  }
}

export async function handleSearchFiles(
  pattern: string,
  projectRoot: string,
  filePattern?: string,
  caseSensitive: boolean = false
): Promise<ToolCallResult> {
  try {
    const caseFlag = caseSensitive ? '' : '-i';
    const includeFlag = filePattern ? `--include="${filePattern}"` : '';

    // Exclude common build/dependency directories to avoid massive output
    const excludeDirs = [
      'node_modules',
      'dist',
      'build',
      '.next',
      '.git',
      'coverage',
      '.turbo',
      '.cache',
      'out',
      '.vercel',
      '*.tsbuildinfo'
    ].map(dir => `--exclude-dir=${dir}`).join(' ');

    // Use grep to search with exclusions, limit to 10 results for token efficiency
    const command = `grep -r ${caseFlag} ${includeFlag} ${excludeDirs} -n "${pattern}" . 2>/dev/null | head -n 10`;

    const { stdout, stderr } = await execAsync(command, {
      cwd: projectRoot,
      maxBuffer: 1024 * 1024 * 5 // 5MB max buffer
    });

    if (stderr && !stdout) {
      return {
        success: false,
        error: 'No matches' // Compressed error
      };
    }

    const result = stdout.trim() || 'No matches found';
    const lines = result.split('\n');
    const limitedResult = lines.length > 10 ? lines.slice(0, 10).join('\n') + '\n[...more]' : result;

    logger.debug(`Search for "${pattern}" found ${lines.length} results (showing up to 10)`);

    return {
      success: true,
      result: `Search results for "${pattern}":\n\n${limitedResult}`
    };
  } catch (error: any) {
    // grep returns exit code 1 when no matches found
    if (error.code === 1) {
      return {
        success: true,
        result: `Search results for "${pattern}":\n\nNo matches found`
      };
    }

    // Handle buffer overflow error gracefully
    if (error.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER') {
      logger.debug(`Search output too large for pattern: ${pattern}`);
      return {
        success: false,
        error: 'Too many results' // Compressed
      };
    }

    logger.debug(`Error searching files:`, error);
    return {
      success: false,
      error: 'Search failed' // Compressed
    };
  }
}

export async function handleListFiles(path: string, projectRoot: string): Promise<ToolCallResult> {
  try {
    const files = await glob(path, {
      cwd: projectRoot,
      ignore: ['node_modules/**', '.git/**', 'dist/**', '**/*.test.*'],
      absolute: false
    });

    // Limit results to 50 for token efficiency
    const limited = files.slice(0, 50);
    const truncated = files.length > 50;

    const result = limited.join('\n') + (truncated ? `\n[...${files.length - 50} more]` : '');

    logger.debug(`Listed ${files.length} files matching "${path}"`);

    return {
      success: true,
      result: result || 'No files found'
    };
  } catch (error: any) {
    logger.debug(`Error listing files:`, error);
    return {
      success: false,
      error: 'List failed' // Compressed
    };
  }
}

export async function handleExecuteCommand(command: string, projectRoot: string): Promise<ToolCallResult> {
  try {
    // Extract the base command
    const baseCommand = command.trim().split(' ')[0];

    // Check if command is in whitelist
    if (!SAFE_COMMANDS.includes(baseCommand)) {
      return {
        success: false,
        error: 'Command not allowed' // Compressed
      };
    }

    const { stdout, stderr } = await execAsync(command, {
      cwd: projectRoot,
      maxBuffer: 1024 * 1024 * 5, // 5MB max buffer for token efficiency
      timeout: 30000 // 30s timeout
    });

    // Limit output to 20KB for token efficiency
    const output = stdout.trim() || stderr.trim() || 'No output';
    const maxOutputSize = 20000;
    const result = output.length > maxOutputSize
      ? output.substring(0, maxOutputSize) + '\n[...truncated]'
      : output;

    logger.debug(`Executed: ${command} (${output.length} chars output)`);

    return {
      success: true,
      result
    };
  } catch (error: any) {
    // Handle buffer overflow
    if (error.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER') {
      return {
        success: false,
        error: 'Output too large' // Compressed
      };
    }

    logger.debug(`Error executing command:`, error);
    return {
      success: false,
      error: 'Command failed' // Compressed
    };
  }
}

export async function handleWebSearch(query: string): Promise<ToolCallResult> {
  try {
    const response = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.exaApiKey
      },
      body: JSON.stringify({
        query,
        numResults: 5,
        contents: { text: { maxCharacters: 1000 } }
      })
    });

    if (!response.ok) {
      return { success: false, error: `Search failed: ${response.status}` };
    }

    const data: any = await response.json();
    const results = data.results?.slice(0, 5).map((r: any) =>
      `${r.title}\n${r.url}\n${r.text || ''}`
    ).join('\n\n') || 'No results';

    return { success: true, result: results };
  } catch (error: any) {
    logger.debug(`Exa search error:`, error);
    return { success: false, error: 'Search failed' };
  }
}

export async function handleGetCodeContext(query: string): Promise<ToolCallResult> {
  try {
    const response = await fetch('https://api.exa.ai/context', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.exaApiKey
      },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      return { success: false, error: `Code context failed: ${response.status}` };
    }

    const data: any = await response.json();
    return { success: true, result: data.context || 'No context found' };
  } catch (error: any) {
    logger.debug(`Exa code context error:`, error);
    return { success: false, error: 'Code context failed' };
  }
}

export async function handleCreateTodos(
  sessionId: string,
  todos: Todo[]
): Promise<ToolCallResult> {
  try {
    todoManager.createTodos(sessionId, todos);
    return {
      success: true,
      result: `Created ${todos.length} tasks`
    };
  } catch (error: any) {
    return { success: false, error: 'Failed to create todos' };
  }
}

export async function handleUpdateTodo(
  sessionId: string,
  todoId: string,
  status: Todo['status']
): Promise<ToolCallResult> {
  try {
    const updated = todoManager.updateTodo(sessionId, todoId, status);
    if (!updated) {
      return { success: false, error: 'Todo not found' };
    }
    return {
      success: true,
      result: `Updated task to ${status}`
    };
  } catch (error: any) {
    return { success: false, error: 'Failed to update todo' };
  }
}

export async function executeToolCall(
  toolName: string,
  args: any,
  projectRoot: string,
  sessionId?: string
): Promise<ToolCallResult> {
  switch (toolName) {
    case 'read_file':
      return handleReadFile(args.file_path, projectRoot);

    case 'search_files':
      return handleSearchFiles(
        args.pattern,
        projectRoot,
        args.file_pattern,
        args.case_sensitive
      );

    case 'list_files':
      return handleListFiles(args.path, projectRoot);

    case 'execute_command':
      return handleExecuteCommand(args.command, projectRoot);

    case 'web_search':
      return handleWebSearch(args.query);

    case 'get_code_context':
      return handleGetCodeContext(args.query);

    case 'create_todos':
      return handleCreateTodos(sessionId || 'default', args.todos);

    case 'update_todo':
      return handleUpdateTodo(sessionId || 'default', args.todo_id, args.status);

    default:
      return {
        success: false,
        error: `Unknown tool: ${toolName}`
      };
  }
}
