import { CodebaseContext } from '../types/index.js';
import { readProjectStructure, readPackageJson, readFiles } from './reader.js';
import { detectFramework, detectLanguage } from './analyzer.js';
import { logger } from '../utils/logger.js';
import { glob } from 'glob';
import chalk from 'chalk';

export async function gatherContext(projectRoot: string, _task: string): Promise<CodebaseContext> {
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

  // Get relevant source files
  const relevantFilePaths = await getRelevantFiles(projectRoot);
  const relevantFiles = await readFiles(relevantFilePaths);

  logger.success('Context gathering complete\n');

  return {
    projectRoot,
    framework,
    language,
    dependencies,
    fileTree,
    relevantFiles
  };
}

async function getRelevantFiles(projectRoot: string): Promise<string[]> {
  try {
    // Focus on key source files
    const patterns = [
      'src/**/*.{ts,js,tsx,jsx}',
      'pages/**/*.{ts,js,tsx,jsx}',
      'app/**/*.{ts,js,tsx,jsx}',
      'routes/**/*.{ts,js}',
      'index.{ts,js}',
      'server.{ts,js}',
      'package.json',
      'tsconfig.json'
    ];

    const files: string[] = [];

    for (const pattern of patterns) {
      const matches = await glob(pattern, {
        cwd: projectRoot,
        ignore: ['node_modules/**', 'dist/**', '.git/**', '**/*.test.*', '**/*.spec.*'],
        absolute: true
      });
      files.push(...matches);
    }

    // Limit to avoid overwhelming context
    return [...new Set(files)].slice(0, 20);
  } catch (error) {
    logger.error('Error getting relevant files:', error);
    return [];
  }
}
