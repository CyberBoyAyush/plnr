import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { glob } from 'glob';
import { logger } from '../utils/logger.js';

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

    // Limit content size to avoid overwhelming context
    const maxSize = 50000;
    const truncated = content.length > maxSize;
    const result = truncated ? content.substring(0, maxSize) + '\n\n[Content truncated...]' : content;

    logger.debug(`Read file: ${filePath} (${content.length} chars)`);
    return {
      success: true,
      result: `File: ${filePath}\n\n${result}`
    };
  } catch (error: any) {
    logger.error(`Error reading file ${filePath}:`, error);
    return {
      success: false,
      error: `Failed to read file: ${error.message}`
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

    // Use grep to search
    const command = `grep -r ${caseFlag} ${includeFlag} -n "${pattern}" . 2>/dev/null | head -n 100`;

    const { stdout, stderr } = await execAsync(command, {
      cwd: projectRoot,
      maxBuffer: 1024 * 1024 * 5 // 5MB max
    });

    if (stderr && !stdout) {
      return {
        success: false,
        error: `Search failed: ${stderr}`
      };
    }

    const result = stdout.trim() || 'No matches found';
    logger.debug(`Search for "${pattern}" found ${result.split('\n').length} results`);

    return {
      success: true,
      result: `Search results for "${pattern}":\n\n${result}`
    };
  } catch (error: any) {
    // grep returns exit code 1 when no matches found
    if (error.code === 1) {
      return {
        success: true,
        result: `Search results for "${pattern}":\n\nNo matches found`
      };
    }

    logger.error(`Error searching files:`, error);
    return {
      success: false,
      error: `Search failed: ${error.message}`
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

    // Limit results
    const limited = files.slice(0, 100);
    const truncated = files.length > 100;

    const result = limited.join('\n') + (truncated ? `\n\n[${files.length - 100} more files not shown]` : '');

    logger.debug(`Listed ${files.length} files matching "${path}"`);

    return {
      success: true,
      result: `Files matching "${path}":\n\n${result || 'No files found'}`
    };
  } catch (error: any) {
    logger.error(`Error listing files:`, error);
    return {
      success: false,
      error: `Failed to list files: ${error.message}`
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
        error: `Command "${baseCommand}" is not allowed. Only safe read-only commands are permitted: ${SAFE_COMMANDS.join(', ')}`
      };
    }

    const { stdout, stderr } = await execAsync(command, {
      cwd: projectRoot,
      maxBuffer: 1024 * 1024 * 5, // 5MB max
      timeout: 30000 // 30s timeout
    });

    const result = stdout.trim() || stderr.trim() || 'Command executed (no output)';
    logger.debug(`Executed: ${command}`);

    return {
      success: true,
      result
    };
  } catch (error: any) {
    logger.error(`Error executing command:`, error);
    return {
      success: false,
      error: `Command failed: ${error.message}`
    };
  }
}

export async function executeToolCall(
  toolName: string,
  args: any,
  projectRoot: string
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

    default:
      return {
        success: false,
        error: `Unknown tool: ${toolName}`
      };
  }
}
