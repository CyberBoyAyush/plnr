#!/usr/bin/env node

import { Command } from 'commander';
import { validateConfig } from './config.js';
import { gatherContext } from './context/gatherer.js';
import { generatePlan } from './planning/planner.js';
import { exportPRD } from './exporters/prd-writer.js';
import { displayPlan, displaySuccess, displayError, displayInfo } from './cli/output.js';
import { Plan, CodebaseContext } from './types/index.js';
import chalk from 'chalk';
import { glob } from 'glob';
import Fuse from 'fuse.js';
import { getInteractiveInput } from './cli/interactive-input.js';

const program = new Command();

// Command definitions
const COMMANDS = [
  { name: '/plan', description: 'Generate an implementation plan (with or without task)' },
  { name: '/export', description: 'Export the current plan as markdown' },
  { name: '/clear', description: 'Clear conversation and start fresh' },
  { name: '/help', description: 'Show available commands' },
  { name: '/exit', description: 'Exit ContextEngine' },
];

// Cache for file paths
let cachedFiles: string[] = [];
let filesFuse: Fuse<string> | null = null;

// Load project files for @ mentions
async function loadProjectFiles(projectRoot: string): Promise<void> {
  try {
    const files = await glob('**/*', {
      cwd: projectRoot,
      ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**', '.next/**', 'coverage/**'],
      nodir: true,
    });
    cachedFiles = files;
    filesFuse = new Fuse(cachedFiles, {
      threshold: 0.3,
    });
  } catch (error) {
    cachedFiles = [];
  }
}


program
  .name('cengine')
  .description('AI-powered planning layer for coding agents')
  .version('1.0.0');

// Interactive mode (default)
program
  .action(async () => {
    try {
      validateConfig();
    } catch (error: any) {
      displayError(error.message);
      process.exit(1);
    }

    // Show welcome banner
    console.log(chalk.bold.cyan('\nContextEngine v1.0.0'));
    console.log(chalk.gray('AI-powered planning for your codebase'));
    console.log(chalk.gray('Model: x-ai/grok-code-fast-1 (via OpenRouter)\n'));
    console.log(chalk.gray('Commands: /plan [task] | /export | /clear | /help | /exit'));
    console.log(chalk.gray('Use @ to mention files (e.g., @src/index.ts)\n'));

    const projectRoot = process.cwd();
    let currentPlan: Plan | null = null;
    let currentTask: string | null = null;
    let context: CodebaseContext | null = null;
    let conversationHistory: Array<{task: string, plan: Plan}> = [];

    // Load project files for autocomplete
    await loadProjectFiles(projectRoot);

    // Main loop
    const mainLoop = async () => {
      while (true) {
        try {
          const input = await getInteractiveInput({
            prompt: chalk.cyan('> '),
            commands: COMMANDS,
            files: cachedFiles,
            filesFuse,
          });

          if (!input.trim()) {
            continue;
          }

        // Extract @mentioned files
        const fileMatches = input.match(/@([\w\/.\\-]+)/g);
        const mentionedFiles = fileMatches ? fileMatches.map(m => m.substring(1)) : [];

        // Handle exit
        if (input === '/exit' || input === '/quit') {
          console.log('');
          displaySuccess('Goodbye! 👋');
          process.exit(0);
        }

        // Handle export
        if (input.startsWith('/export')) {
          if (!currentPlan || !currentTask) {
            console.log('');
            displayError('No plan to export. Generate a plan first.');
            console.log('');
            continue;
          }

          try {
            const filePath = await exportPRD(currentPlan, currentTask, projectRoot);
            console.log('');
            displaySuccess(`Plan exported to: ${filePath}`);
            console.log('');
          } catch (error: any) {
            console.log('');
            displayError(error.message);
            console.log('');
          }
          continue;
        }

        // Handle clear
        if (input === '/clear') {
          console.clear();
          console.log(chalk.bold.cyan('\nContextEngine v1.0.0'));
          console.log(chalk.gray('AI-powered planning for your codebase'));
          console.log(chalk.gray('Model: x-ai/grok-code-fast-1 (via OpenRouter)\n'));
          console.log(chalk.gray('Commands: /plan [task] | /export | /clear | /help | /exit'));
          console.log(chalk.gray('Use @ to mention files (e.g., @src/index.ts)\n'));

          // Reset state
          currentPlan = null;
          currentTask = null;
          context = null;
          conversationHistory = [];

          displaySuccess('Conversation cleared!');
          console.log('');
          continue;
        }

        // Handle help
        if (input === '/help' || input === '?') {
          console.log('');
          displayInfo('Available commands:');
          console.log('  /plan [task]   - Generate an implementation plan (with or without task)');
          console.log('  /export        - Export the current plan as markdown');
          console.log('  /clear         - Clear conversation and start fresh');
          console.log('  /help          - Show this help message');
          console.log('  /exit          - Exit ContextEngine');
          console.log('');
          displayInfo('File mentions:');
          console.log('  @file.ts       - Mention a file (use Tab for autocomplete)');
          console.log('  Example: "Explain @src/index.ts"');
          console.log('');
          displayInfo('Keyboard shortcuts:');
          console.log('  Ctrl+C         - Exit ContextEngine');
          console.log('  Tab            - Autocomplete commands and files');
          console.log('  ESC            - Cancel current AI request');
          console.log('');
          displayInfo('Usage:');
          console.log('  Just chat:  "How do I add authentication?"');
          console.log('  Make plan:  "/plan Add JWT authentication"');
          console.log('  With files: "/plan @src/auth.ts Add JWT to this file"');
          console.log('');
          continue;
        }

        // Handle /plan command (with or without arguments)
        if (input === '/plan' || input.startsWith('/plan ')) {
          let task: string;

          // If /plan with arguments, use the provided task
          if (input.startsWith('/plan ')) {
            task = input.substring(6).trim();
            if (!task) {
              displayError('Please provide a task. Example: /plan Add user authentication');
              console.log('');
              continue;
            }
          } else {
            // If just /plan, use last context if available
            if (!currentTask && conversationHistory.length === 0) {
              displayError('No previous context. Please provide a task: /plan [your task]');
              console.log('');
              continue;
            }

            // Use the last task or generate a summary from conversation
            task = currentTask || 'Generate a plan based on our previous conversation';
            console.log('');
            displayInfo(`Generating plan based on previous context...`);
          }

          try {
            currentTask = task;
            console.log('');

            // Step 1: Gather context (only first time or if needed)
            if (!context) {
              context = await gatherContext(projectRoot, task, mentionedFiles);
            }

            // Step 2: Generate plan with conversation history
            currentPlan = await generatePlan(context, task, conversationHistory, true);

            // Add to history
            conversationHistory.push({ task, plan: currentPlan });

            // Step 3: Display results
            console.log('\n');
            displayPlan(currentPlan);

            console.log('\n');
            displaySuccess('Plan generated! Type /export to save, or continue chatting.');
            console.log('');
          } catch (error: any) {
            console.log('\n');
            displayError(error.message || 'An error occurred');
            console.log('');
          }
          continue;
        }

        // Default: Chat mode (conversational)
        try {
          console.log('');

          // Step 1: Gather context (only first time)
          if (!context) {
            context = await gatherContext(projectRoot, input, mentionedFiles);
          }

          // Step 2: Generate conversational response
          const response = await generatePlan(context, input, conversationHistory, false);

          // Add to history
          conversationHistory.push({ task: input, plan: response });

          // Step 3: Display results
          console.log('\n');
          console.log(chalk.bold('Response:'));
          console.log(response.summary);

          if (response.steps && response.steps.length > 0) {
            console.log('\n' + chalk.bold('Suggestions:'));
            response.steps.slice(0, 3).forEach((step, i) => {
              console.log(`${i + 1}. ${step.title}`);
            });
          }

          console.log('');
        } catch (error: any) {
          console.log('\n');
          displayError(error.message || 'An error occurred');
          console.log('');
        }
      } catch (error: any) {
        console.log('\n');
        displayError('An error occurred: ' + (error.message || error));
        console.log('');
      }
    }
  };

  mainLoop();
  });

program.parse();
