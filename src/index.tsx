#!/usr/bin/env node

import { Command } from 'commander';
import readlineSync from 'readline-sync';
import { validateConfig } from './config.js';
import { gatherContext } from './context/gatherer.js';
import { generatePlan } from './planning/planner.js';
import { exportPRD } from './exporters/prd-writer.js';
import { displayPlan, displaySuccess, displayError, displayInfo } from './cli/output.js';
import { Plan, CodebaseContext } from './types/index.js';
import chalk from 'chalk';

const program = new Command();

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
    console.log(chalk.gray('Model: x-ai/grok-2-1212 (via OpenRouter)\n'));
    console.log(chalk.gray('Commands: /export /help /exit\n'));

    const projectRoot = process.cwd();
    let currentPlan: Plan | null = null;
    let currentTask: string | null = null;
    let context: CodebaseContext | null = null;
    let conversationHistory: Array<{task: string, plan: Plan}> = [];

    // Main loop
    while (true) {
      const input = readlineSync.question(chalk.cyan('> '), {
        hideEchoBack: false,
      });

      if (!input.trim()) continue;

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

      // Handle help
      if (input === '/help' || input === '?') {
        console.log('');
        displayInfo('Available commands:');
        console.log('  /export  - Export the current plan as markdown');
        console.log('  /help    - Show this help message');
        console.log('  /exit    - Exit ContextEngine');
        console.log('');
        continue;
      }

      // Regular task - generate plan
      try {
        currentTask = input;
        console.log('');

        // Step 1: Gather context (only first time or if needed)
        if (!context) {
          context = await gatherContext(projectRoot, input);
        }

        // Step 2: Generate plan with conversation history
        currentPlan = await generatePlan(context, input, conversationHistory);

        // Add to history
        conversationHistory.push({ task: input, plan: currentPlan });

        // Step 3: Display results
        console.log('\n');
        displayPlan(currentPlan);

        console.log('\n');
        displaySuccess('Plan generated! Type /export to save, or ask a follow-up question.');
        console.log('');
      } catch (error: any) {
        console.log('\n');
        displayError(error.message || 'An error occurred');
        console.log('');
      }
    }
  });

program.parse();
