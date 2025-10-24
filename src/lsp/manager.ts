import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { LspClient } from './client.js';
import { logger } from '../utils/logger.js';

const execAsync = promisify(exec);

let globalLspClient: LspClient | null = null;
let lspAvailable: boolean | null = null;

async function detectTypeScriptLanguageServer(): Promise<string | null> {
  // Try global typescript-language-server first (user's preferred version)
  const commands = process.platform === 'win32' 
    ? ['typescript-language-server.cmd', 'typescript-language-server']
    : ['typescript-language-server'];

  for (const cmd of commands) {
    try {
      await execAsync(`${cmd} --version`, { timeout: 2000 });
      logger.debug(`Found global typescript-language-server: ${cmd}`);
      return cmd;
    } catch {
      continue;
    }
  }

  // Try bundled typescript-language-server (installed with plnr)
  try {
    // Check in plnr's own node_modules (when installed globally or locally)
    const { fileURLToPath } = await import('url');
    const { dirname } = await import('path');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    
    // Go up to plnr root: dist/lsp -> dist -> root
    const plnrRoot = join(__dirname, '..', '..');
    const bundledPath = join(plnrRoot, 'node_modules', '.bin', 'typescript-language-server');
    const bundledPathWin = process.platform === 'win32' ? `${bundledPath}.cmd` : bundledPath;
    
    await execAsync(`"${bundledPathWin}" --version`, { timeout: 2000 });
    logger.debug(`Found bundled typescript-language-server: ${bundledPathWin}`);
    return bundledPathWin;
  } catch {
    // Bundled version not found
  }

  return null;
}

export async function getLspClient(projectRoot: string, signal?: AbortSignal): Promise<LspClient | null> {
  // Return cached client if already initialized
  if (globalLspClient) {
    return globalLspClient;
  }

  // Return null if we already know LSP is unavailable
  if (lspAvailable === false) {
    return null;
  }

  // Try to detect and start LSP
  try {
    const command = await detectTypeScriptLanguageServer();
    if (!command) {
      logger.debug('typescript-language-server not found, LSP features disabled');
      lspAvailable = false;
      return null;
    }

    const client = new LspClient(command, ['--stdio'], projectRoot);
    const started = await client.start(signal);

    if (started) {
      globalLspClient = client;
      lspAvailable = true;
      logger.debug('LSP client started successfully');
      return client;
    } else {
      lspAvailable = false;
      return null;
    }
  } catch (error) {
    logger.debug('Failed to initialize LSP:', error);
    lspAvailable = false;
    return null;
  }
}

export function stopLspClient(): void {
  if (globalLspClient) {
    globalLspClient.stop();
    globalLspClient = null;
    lspAvailable = null;
  }
}

// Helper to convert file path to absolute if needed
export function toAbsolutePath(filePath: string, projectRoot: string): string {
  if (filePath.startsWith('/') || /^[a-zA-Z]:/.test(filePath)) {
    return filePath;
  }
  return join(projectRoot, filePath);
}

// Helper to parse URI to file path
export function uriToPath(uri: string): string {
  if (uri.startsWith('file://')) {
    let path = uri.substring(7);
    // Windows: file:///C:/path -> C:/path
    if (process.platform === 'win32' && path.startsWith('/')) {
      path = path.substring(1);
    }
    return path;
  }
  return uri;
}
