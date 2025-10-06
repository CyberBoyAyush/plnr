import fs from 'fs/promises';
import { glob } from 'glob';
import { FileInfo } from '../types/index.js';
import { logger } from '../utils/logger.js';
import chalk from 'chalk';

export async function readProjectStructure(rootPath: string): Promise<string> {
  try {
    logger.info('Scanning project structure...');
    const files = await glob('**/*', {
      cwd: rootPath,
      ignore: ['node_modules/**', 'dist/**', '.git/**', '*.log', '.cengine/**'],
      nodir: true,
      maxDepth: 3
    });

    console.log(chalk.gray(`  Found ${files.length} files`));
    return files.join('\n');
  } catch (error) {
    logger.error('Error reading project structure:', error);
    return '';
  }
}

export async function readFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    logger.error(`Error reading file ${filePath}:`, error);
    return '';
  }
}

export async function readFiles(filePaths: string[]): Promise<FileInfo[]> {
  const fileInfos: FileInfo[] = [];

  console.log(chalk.blue('\n📄 Reading key files:'));
  for (const filePath of filePaths) {
    try {
      const content = await readFile(filePath);
      const stats = await fs.stat(filePath);

      // Show relative path
      const relativePath = filePath.replace(process.cwd(), '.');
      console.log(chalk.gray(`  ✓ ${relativePath}`));

      fileInfos.push({
        path: filePath,
        content,
        size: stats.size
      });
    } catch (error) {
      logger.warn(`Skipping file ${filePath}`);
    }
  }

  return fileInfos;
}

export async function readPackageJson(rootPath: string): Promise<any> {
  try {
    const packagePath = `${rootPath}/package.json`;
    const content = await fs.readFile(packagePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    logger.warn('No package.json found');
    return null;
  }
}
