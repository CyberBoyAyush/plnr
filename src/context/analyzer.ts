import { logger } from '../utils/logger.js';

const FRAMEWORK_INDICATORS: Record<string, string[]> = {
  'Next.js': ['next', 'next.config'],
  'Express': ['express'],
  'React': ['react', 'react-dom'],
  'Vue': ['vue'],
  'Angular': ['@angular/core'],
  'NestJS': ['@nestjs/core'],
  'Fastify': ['fastify'],
  'Koa': ['koa']
};

export function detectFramework(dependencies: Record<string, string> = {}): string | undefined {
  const allDeps = Object.keys(dependencies);

  for (const [framework, indicators] of Object.entries(FRAMEWORK_INDICATORS)) {
    if (indicators.some(indicator => allDeps.includes(indicator))) {
      logger.debug(`Detected framework: ${framework}`);
      return framework;
    }
  }

  return undefined;
}

export function detectLanguage(fileTree: string): string {
  if (fileTree.includes('.ts') || fileTree.includes('.tsx')) {
    return 'TypeScript';
  }
  if (fileTree.includes('.js') || fileTree.includes('.jsx')) {
    return 'JavaScript';
  }
  if (fileTree.includes('.py')) {
    return 'Python';
  }
  if (fileTree.includes('.go')) {
    return 'Go';
  }
  if (fileTree.includes('.rs')) {
    return 'Rust';
  }

  return 'Unknown';
}
