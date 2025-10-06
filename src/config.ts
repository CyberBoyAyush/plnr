import dotenv from 'dotenv';
import { Config } from './types/index.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env from current directory (where user runs the command)
dotenv.config();

// Also try to load from the tool's installation directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const toolRoot = join(__dirname, '..');
dotenv.config({ path: join(toolRoot, '.env') });

export const config: Config = {
  openRouterApiKey: process.env.OPENROUTER_API_KEY || '',
  exaApiKey: process.env.EXA_API_KEY || '',
  model: process.env.MODEL || 'x-ai/grok-code-fast-1',
  modelContextWindow: parseInt(process.env.MODEL_CONTEXT_WINDOW || '256000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  debug: process.env.DEBUG === 'true'
};

export function validateConfig(): void {
  if (!config.openRouterApiKey) {
    throw new Error(
      'OPENROUTER_API_KEY is required. Please set it as an environment variable:\n' +
      '  export OPENROUTER_API_KEY=sk-or-v1-xxxxx\n' +
      'Or add it to a .env file in the current directory.'
    );
  }
}
