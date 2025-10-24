import { spawn, ChildProcess } from 'child_process';
import { logger } from '../utils/logger.js';

interface LspMessage {
  jsonrpc: '2.0';
  id?: number;
  method?: string;
  params?: any;
  result?: any;
  error?: any;
}

export class LspClient {
  private process: ChildProcess | null = null;
  private messageId = 0;
  private pendingRequests = new Map<number, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }>();
  private buffer = '';
  private initialized = false;

  constructor(
    private command: string,
    private args: string[],
    private rootPath: string
  ) {}

  async start(signal?: AbortSignal): Promise<boolean> {
    try {
      this.process = spawn(this.command, this.args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: this.rootPath
      });

      if (!this.process.stdin || !this.process.stdout) {
        throw new Error('Failed to get stdio streams');
      }

      // Handle stdout data
      this.process.stdout.on('data', (data: Buffer) => {
        this.buffer += data.toString();
        this.processBuffer();
      });

      // Handle errors
      this.process.on('error', (error) => {
        logger.debug('LSP process error:', error);
        this.cleanup();
      });

      this.process.on('exit', () => {
        this.cleanup();
      });

      // Handle abort signal
      if (signal) {
        signal.addEventListener('abort', () => {
          this.stop();
        });
      }

      // Initialize
      await this.initialize();
      this.initialized = true;
      logger.debug('LSP client initialized');
      return true;
    } catch (error) {
      logger.debug('Failed to start LSP:', error);
      this.cleanup();
      return false;
    }
  }

  private async initialize(): Promise<void> {
    const response = await this.sendRequest('initialize', {
      processId: process.pid,
      rootUri: `file://${this.rootPath}`,
      capabilities: {
        textDocument: {
          definition: { dynamicRegistration: false },
          references: { dynamicRegistration: false },
          documentSymbol: { dynamicRegistration: false }
        },
        workspace: {
          symbol: { dynamicRegistration: false }
        }
      }
    }, 5000);

    if (response.error) {
      throw new Error(response.error.message);
    }

    // Send initialized notification
    this.sendNotification('initialized', {});
  }

  private processBuffer(): void {
    while (true) {
      const headerEnd = this.buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) break;

      const headerText = this.buffer.substring(0, headerEnd);
      const contentLengthMatch = headerText.match(/Content-Length: (\d+)/);
      
      if (!contentLengthMatch) {
        this.buffer = this.buffer.substring(headerEnd + 4);
        continue;
      }

      const contentLength = parseInt(contentLengthMatch[1], 10);
      const messageStart = headerEnd + 4;
      const messageEnd = messageStart + contentLength;

      if (this.buffer.length < messageEnd) break;

      const messageText = this.buffer.substring(messageStart, messageEnd);
      this.buffer = this.buffer.substring(messageEnd);

      try {
        const message: LspMessage = JSON.parse(messageText);
        this.handleMessage(message);
      } catch (error) {
        logger.debug('Failed to parse LSP message:', error);
      }
    }
  }

  private handleMessage(message: LspMessage): void {
    if (message.id !== undefined && this.pendingRequests.has(message.id)) {
      const pending = this.pendingRequests.get(message.id)!;
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(message.id);
      
      if (message.error) {
        pending.reject(new Error(message.error.message));
      } else {
        pending.resolve(message);
      }
    }
  }

  async sendRequest(method: string, params: any, timeoutMs: number = 10000): Promise<LspMessage> {
    if (!this.process || !this.process.stdin) {
      throw new Error('LSP not started');
    }

    const id = ++this.messageId;
    const message: LspMessage = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`LSP request timeout: ${method}`));
      }, timeoutMs);

      this.pendingRequests.set(id, { resolve, reject, timeout });

      const content = JSON.stringify(message);
      const header = `Content-Length: ${Buffer.byteLength(content, 'utf8')}\r\n\r\n`;
      this.process!.stdin!.write(header + content, 'utf8');
    });
  }

  private sendNotification(method: string, params: any): void {
    if (!this.process || !this.process.stdin) return;

    const message: LspMessage = {
      jsonrpc: '2.0',
      method,
      params
    };

    const content = JSON.stringify(message);
    const header = `Content-Length: ${Buffer.byteLength(content, 'utf8')}\r\n\r\n`;
    this.process.stdin.write(header + content, 'utf8');
  }

  async definition(file: string, line: number, character: number): Promise<any> {
    if (!this.initialized) return null;

    try {
      const response = await this.sendRequest('textDocument/definition', {
        textDocument: { uri: `file://${file}` },
        position: { line, character }
      }, 5000);

      return response.result;
    } catch {
      return null;
    }
  }

  async references(file: string, line: number, character: number): Promise<any> {
    if (!this.initialized) return null;

    try {
      const response = await this.sendRequest('textDocument/references', {
        textDocument: { uri: `file://${file}` },
        position: { line, character },
        context: { includeDeclaration: true }
      }, 5000);

      return response.result;
    } catch {
      return null;
    }
  }

  async documentSymbols(file: string): Promise<any> {
    if (!this.initialized) return null;

    try {
      const response = await this.sendRequest('textDocument/documentSymbol', {
        textDocument: { uri: `file://${file}` }
      }, 5000);

      return response.result;
    } catch {
      return null;
    }
  }

  async workspaceSymbols(query: string): Promise<any> {
    if (!this.initialized) return null;

    try {
      const response = await this.sendRequest('workspace/symbol', {
        query
      }, 5000);

      return response.result;
    } catch {
      return null;
    }
  }

  stop(): void {
    if (this.process) {
      this.sendNotification('shutdown', {});
      this.sendNotification('exit', {});
      this.process.kill();
    }
    this.cleanup();
  }

  private cleanup(): void {
    for (const pending of this.pendingRequests.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('LSP client stopped'));
    }
    this.pendingRequests.clear();
    this.process = null;
    this.initialized = false;
  }
}
