import { CodebaseContext, FileInfo } from '../types/index.js';
import { readProjectStructure, readPackageJson } from './reader.js';
import { detectFramework, detectLanguage } from './analyzer.js';
import { logger } from '../utils/logger.js';
import chalk from 'chalk';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function gatherContext(
  projectRoot: string,
  _task: string,
  mentionedFiles: string[] = []
): Promise<CodebaseContext> {
  console.log(chalk.bold.cyan('\n🔍 Analyzing Codebase\n'));

  const fileTree = await readProjectStructure(projectRoot);
  const packageJson = await readPackageJson(projectRoot);

  const dependencies = packageJson
    ? Object.keys({ ...packageJson.dependencies, ...packageJson.devDependencies })
    : [];

  const framework = detectFramework(
    packageJson ? { ...packageJson.dependencies, ...packageJson.devDependencies } : {}
  );

  const language = detectLanguage(fileTree);

  // Display detected info
  console.log(chalk.blue('📦 Detected:'));
  console.log(chalk.gray(`  Language: ${language}`));
  console.log(chalk.gray(`  Framework: ${framework || 'None'}`));
  console.log(chalk.gray(`  Dependencies: ${dependencies.length} packages`));

  // Read only @-mentioned files upfront if provided
  const relevantFiles: FileInfo[] = [];
  if (mentionedFiles.length > 0) {
    console.log(chalk.blue(`\n📎 Reading ${mentionedFiles.length} mentioned file(s)...\n`));
    for (const filePath of mentionedFiles) {
      try {
        const absolutePath = join(projectRoot, filePath);
        const content = await readFile(absolutePath, 'utf-8');
        const stats = await import('fs/promises').then(fs => fs.stat(absolutePath));
        relevantFiles.push({
          path: filePath,
          content,
          size: stats.size
        });
        console.log(chalk.gray(`  ✓ ${filePath}`));
      } catch (error) {
        logger.error(`Failed to read mentioned file ${filePath}:`, error);
      }
    }
  }

  logger.success('Initial context gathering complete\n');

  return {
    projectRoot,
    framework,
    language,
    dependencies,
    fileTree,
    relevantFiles
  };
}
