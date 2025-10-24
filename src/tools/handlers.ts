import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { glob } from 'glob';
import { logger } from '../utils/logger.js';
import { config } from '../config.js';
import { todoManager, Todo } from '../utils/todo-manager.js';
import { getLspClient, toAbsolutePath, uriToPath } from '../lsp/manager.js';

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

// Shared ignore patterns for consistency
const IGNORE_PATTERNS = [
  'node_modules/**',
  'dist/**',
  'build/**',
  '.git/**',
  '.next/**',
  'coverage/**',
  '.turbo/**',
  '.cache/**',
  'out/**',
  '*.tsbuildinfo'
];

// Default code file extensions for JS/TS projects
const CODE_EXTENSIONS = '*.{ts,tsx,js,jsx,mjs,cjs}';

interface SearchMatch {
  file: string;
  line: number;
  text: string;
}

function rankFiles(files: string[]): string[] {
  const extPriority: Record<string, number> = {
    '.ts': 1, '.tsx': 2, '.js': 3, '.jsx': 4, '.mjs': 5, '.cjs': 6
  };
  
  return files.sort((a, b) => {
    const extA = a.substring(a.lastIndexOf('.'));
    const extB = b.substring(b.lastIndexOf('.'));
    const priorityA = extPriority[extA] || 99;
    const priorityB = extPriority[extB] || 99;
    
    if (priorityA !== priorityB) return priorityA - priorityB;
    
    const depthA = a.split('/').length;
    const depthB = b.split('/').length;
    return depthA - depthB;
  });
}

function formatGroupedResults(matches: SearchMatch[], maxFiles: number = 8, maxHitsPerFile: number = 2): string {
  if (matches.length === 0) return 'No matches found';
  
  const byFile = new Map<string, SearchMatch[]>();
  for (const match of matches) {
    if (!byFile.has(match.file)) byFile.set(match.file, []);
    byFile.get(match.file)!.push(match);
  }
  
  const rankedFiles = rankFiles(Array.from(byFile.keys())).slice(0, maxFiles);
  const parts: string[] = [];
  
  for (const file of rankedFiles) {
    const fileMatches = byFile.get(file)!.slice(0, maxHitsPerFile);
    parts.push(file);
    for (const m of fileMatches) {
      parts.push(`  ${m.line}: ${m.text.trim()}`);
    }
  }
  
  return parts.join('\n');
}

async function nodeFallbackSearch(
  pattern: string,
  projectRoot: string,
  filePattern: string,
  caseSensitive: boolean
): Promise<SearchMatch[]> {
  const matches: SearchMatch[] = [];
  const files = await glob(filePattern, {
    cwd: projectRoot,
    ignore: IGNORE_PATTERNS,
    absolute: false
  });
  
  const regex = new RegExp(pattern, caseSensitive ? 'g' : 'gi');
  let fileCount = 0;
  
  for (const file of files) {
    if (fileCount >= 8) break;
    
    try {
      const content = await readFile(join(projectRoot, file), 'utf-8');
      const lines = content.split('\n');
      let hitCount = 0;
      
      for (let i = 0; i < lines.length && hitCount < 2; i++) {
        if (regex.test(lines[i])) {
          matches.push({ file, line: i + 1, text: lines[i] });
          hitCount++;
        }
      }
      
      if (hitCount > 0) fileCount++;
    } catch {
      continue;
    }
  }
  
  return matches;
}

export async function handleSearchFiles(
  pattern: string,
  projectRoot: string,
  filePattern?: string,
  caseSensitive: boolean = false
): Promise<ToolCallResult> {
  try {
    let command: string;
    let useRipgrep = false;
    let useGrep = false;

    // Check ripgrep (cross-platform: rg --version works everywhere)
    try {
      await execAsync('rg --version', { cwd: projectRoot, timeout: 1000 });
      useRipgrep = true;
    } catch {
      // Try grep
      try {
        await execAsync('grep --version', { cwd: projectRoot, timeout: 1000 });
        useGrep = true;
      } catch {
        // Node fallback for Windows without grep
      }
    }

    const defaultGlob = filePattern || CODE_EXTENSIONS;

    if (useRipgrep) {
      const caseFlagRg = caseSensitive ? '--case-sensitive' : '--smart-case';
      const includeFlagRg = `--glob "${defaultGlob}"`;
      command = `rg ${caseFlagRg} ${includeFlagRg} --line-number --no-heading --color=never --max-count 100 "${pattern}" . 2>/dev/null`;
      logger.debug(`Using ripgrep for search: ${pattern}`);
    } else if (useGrep) {
      const hasUpperCase = /[A-Z]/.test(pattern);
      const caseFlag = caseSensitive || hasUpperCase ? '' : '-i';
      const includeFlag = `--include="${defaultGlob}"`;
      const excludeDirs = IGNORE_PATTERNS.filter(p => !p.includes('*'))
        .map(dir => `--exclude-dir=${dir.replace('/**', '')}`).join(' ');
      
      command = `grep -r ${caseFlag} ${includeFlag} ${excludeDirs} -n "${pattern}" . 2>/dev/null | head -n 200`;
      logger.debug(`Using grep for search: ${pattern}`);
    } else {
      // Node fallback
      logger.debug(`Using Node fallback for search: ${pattern}`);
      const matches = await nodeFallbackSearch(pattern, projectRoot, defaultGlob, caseSensitive);
      return {
        success: true,
        result: `Search results for "${pattern}":\n\n${formatGroupedResults(matches)}`
      };
    }

    const { stdout } = await execAsync(command, {
      cwd: projectRoot,
      maxBuffer: 1024 * 1024 * 5
    });

    if (!stdout.trim()) {
      return {
        success: true,
        result: `Search results for "${pattern}":\n\nNo matches found`
      };
    }

    // Parse output into structured matches
    const matches: SearchMatch[] = [];
    for (const line of stdout.trim().split('\n')) {
      const match = line.match(/^([^:]+):(\d+):(.+)$/);
      if (match) {
        matches.push({
          file: match[1],
          line: parseInt(match[2], 10),
          text: match[3]
        });
      }
    }

    const result = formatGroupedResults(matches);
    logger.debug(`Search for "${pattern}" found ${matches.length} results`);

    return {
      success: true,
      result: `Search results for "${pattern}":\n\n${result}`
    };
  } catch (error: any) {
    if (error.code === 1) {
      return {
        success: true,
        result: `Search results for "${pattern}":\n\nNo matches found`
      };
    }

    if (error.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER') {
      logger.debug(`Search output too large for pattern: ${pattern}`);
      return {
        success: false,
        error: 'Too many results'
      };
    }

    // Final fallback to Node if command execution failed
    if (error.code === 'ENOENT') {
      try {
        const matches = await nodeFallbackSearch(pattern, projectRoot, filePattern || CODE_EXTENSIONS, caseSensitive);
        return {
          success: true,
          result: `Search results for "${pattern}":\n\n${formatGroupedResults(matches)}`
        };
      } catch {
        return { success: false, error: 'Search failed' };
      }
    }

    logger.debug(`Error searching files:`, error);
    return {
      success: false,
      error: 'Search failed'
    };
  }
}

export async function handleListFiles(path: string, projectRoot: string): Promise<ToolCallResult> {
  try {
    const files = await glob(path, {
      cwd: projectRoot,
      ignore: IGNORE_PATTERNS.concat(['**/*.test.*']),
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
    // Validate input
    if (!todos || !Array.isArray(todos) || todos.length === 0) {
      logger.debug('Invalid or empty todos array');
      return { success: false, error: 'Invalid or empty todos array' };
    }

    todoManager.createTodos(sessionId, todos);
    logger.debug(`Created ${todos.length} todos for session ${sessionId}`);
    return {
      success: true,
      result: `Created ${todos.length} tasks`
    };
  } catch (error: any) {
    logger.debug('Error creating todos:', error);
    return { success: false, error: 'Failed to create todos' };
  }
}

export async function handleUpdateTodo(
  sessionId: string,
  todoId: string,
  status: Todo['status']
): Promise<ToolCallResult> {
  try {
    // Validate input
    if (!todoId || typeof todoId !== 'string') {
      logger.debug('Invalid todo ID');
      return { success: false, error: 'Invalid todo ID' };
    }
    if (!status || !['pending', 'in_progress', 'completed'].includes(status)) {
      logger.debug('Invalid status');
      return { success: false, error: 'Invalid status' };
    }

    const updated = todoManager.updateTodo(sessionId, todoId, status);
    if (!updated) {
      return { success: false, error: 'Todo not found' };
    }
    logger.debug(`Updated todo ${todoId} to ${status} for session ${sessionId}`);
    return {
      success: true,
      result: `Updated task to ${status}`
    };
  } catch (error: any) {
    logger.debug('Error updating todo:', error);
    return { success: false, error: 'Failed to update todo' };
  }
}

export async function handleFindDefinition(
  file: string,
  line: number,
  character: number,
  projectRoot: string,
  signal?: AbortSignal
): Promise<ToolCallResult> {
  try {
    const lsp = await getLspClient(projectRoot, signal);
    
    if (lsp) {
      const absPath = toAbsolutePath(file, projectRoot);
      const result = await lsp.definition(absPath, line, character);
      
      if (result && Array.isArray(result) && result.length > 0) {
        const def = result[0];
        const defPath = uriToPath(def.uri);
        const relativePath = defPath.replace(projectRoot + '/', '');
        return {
          success: true,
          result: `Definition at ${relativePath}:${def.range.start.line + 1}`
        };
      }
    }
    
    // Fallback to search
    const content = await readFile(toAbsolutePath(file, projectRoot), 'utf-8');
    const lines = content.split('\n');
    const symbolLine = lines[line] || '';
    const symbolMatch = symbolLine.substring(character).match(/^(\w+)/);
    
    if (symbolMatch) {
      return handleSearchFiles(symbolMatch[1], projectRoot);
    }
    
    return { success: false, error: 'Symbol not found' };
  } catch (error: any) {
    logger.debug('Error finding definition:', error);
    return { success: false, error: 'Definition lookup failed' };
  }
}

export async function handleFindReferences(
  file: string,
  line: number,
  character: number,
  projectRoot: string,
  signal?: AbortSignal
): Promise<ToolCallResult> {
  try {
    const lsp = await getLspClient(projectRoot, signal);
    
    if (lsp) {
      const absPath = toAbsolutePath(file, projectRoot);
      const result = await lsp.references(absPath, line, character);
      
      if (result && Array.isArray(result) && result.length > 0) {
        const refs = result.slice(0, 10).map((ref: any) => {
          const refPath = uriToPath(ref.uri);
          const relativePath = refPath.replace(projectRoot + '/', '');
          return `${relativePath}:${ref.range.start.line + 1}`;
        });
        return {
          success: true,
          result: `Found ${result.length} reference(s):\n${refs.join('\n')}`
        };
      }
    }
    
    // Fallback to search
    const content = await readFile(toAbsolutePath(file, projectRoot), 'utf-8');
    const lines = content.split('\n');
    const symbolLine = lines[line] || '';
    const symbolMatch = symbolLine.substring(character).match(/^(\w+)/);
    
    if (symbolMatch) {
      return handleSearchFiles(symbolMatch[1], projectRoot);
    }
    
    return { success: true, result: 'No references found' };
  } catch (error: any) {
    logger.debug('Error finding references:', error);
    return { success: false, error: 'References lookup failed' };
  }
}

export async function handleGetDocumentSymbols(
  file: string,
  projectRoot: string,
  signal?: AbortSignal
): Promise<ToolCallResult> {
  try {
    const lsp = await getLspClient(projectRoot, signal);
    
    if (lsp) {
      const absPath = toAbsolutePath(file, projectRoot);
      const result = await lsp.documentSymbols(absPath);
      
      if (result && Array.isArray(result)) {
        const symbols = result.slice(0, 20).map((sym: any) => {
          const kind = sym.kind === 12 ? 'function' : sym.kind === 5 ? 'class' : 'symbol';
          return `${sym.name} (${kind}) at line ${(sym.range?.start?.line || 0) + 1}`;
        });
        return {
          success: true,
          result: `Symbols in ${file}:\n${symbols.join('\n')}`
        };
      }
    }
    
    // Fallback to read_file
    return handleReadFile(file, projectRoot);
  } catch (error: any) {
    logger.debug('Error getting document symbols:', error);
    return { success: false, error: 'Symbol lookup failed' };
  }
}

export async function handleWorkspaceSymbols(
  query: string,
  projectRoot: string,
  signal?: AbortSignal
): Promise<ToolCallResult> {
  try {
    const lsp = await getLspClient(projectRoot, signal);
    
    if (lsp) {
      const result = await lsp.workspaceSymbols(query);
      
      if (result && Array.isArray(result) && result.length > 0) {
        const symbols = result.slice(0, 10).map((sym: any) => {
          const symPath = uriToPath(sym.location.uri);
          const relativePath = symPath.replace(projectRoot + '/', '');
          return `${sym.name} in ${relativePath}:${sym.location.range.start.line + 1}`;
        });
        return {
          success: true,
          result: `Found ${symbols.length} symbol(s):\n${symbols.join('\n')}`
        };
      }
    }
    
    // Fallback to search
    return handleSearchFiles(query, projectRoot);
  } catch (error: any) {
    logger.debug('Error workspace symbol search:', error);
    return { success: false, error: 'Symbol search failed' };
  }
}

export async function executeToolCall(
  toolName: string,
  args: any,
  projectRoot: string,
  sessionId?: string,
  signal?: AbortSignal
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
      if (!args || !args.todos) {
        return { success: false, error: 'Missing required parameter: todos' };
      }
      return handleCreateTodos(sessionId || 'default', args.todos);

    case 'update_todo':
      if (!args || !args.todo_id || !args.status) {
        return { success: false, error: 'Missing required parameters: todo_id or status' };
      }
      return handleUpdateTodo(sessionId || 'default', args.todo_id, args.status);

    case 'find_definition':
      if (!args || args.file === undefined || args.line === undefined || args.character === undefined) {
        return { success: false, error: 'Missing required parameters: file, line, character' };
      }
      return handleFindDefinition(args.file, args.line, args.character, projectRoot, signal);

    case 'find_references':
      if (!args || args.file === undefined || args.line === undefined || args.character === undefined) {
        return { success: false, error: 'Missing required parameters: file, line, character' };
      }
      return handleFindReferences(args.file, args.line, args.character, projectRoot, signal);

    case 'get_document_symbols':
      if (!args || !args.file) {
        return { success: false, error: 'Missing required parameter: file' };
      }
      return handleGetDocumentSymbols(args.file, projectRoot, signal);

    case 'workspace_symbols':
      if (!args || !args.query) {
        return { success: false, error: 'Missing required parameter: query' };
      }
      return handleWorkspaceSymbols(args.query, projectRoot, signal);

    default:
      return {
        success: false,
        error: `Unknown tool: ${toolName}`
      };
  }
}
