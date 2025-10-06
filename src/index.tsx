#!/usr/bin/env node

// Suppress deprecation warnings
process.removeAllListeners('warning');
process.on('warning', (warning) => {
  if (warning.name === 'DeprecationWarning') return;
  console.warn(warning);
});

import { Command } from 'commander';
import { validateConfig, config } from './config.js';
import { gatherContext } from './context/gatherer.js';
import { generatePlan } from './planning/planner.js';
import { exportPRD } from './exporters/prd-writer.js';
import { displayPlan, displaySuccess, displayError, displayInfo } from './cli/output.js';
import { Plan, CodebaseContext } from './types/index.js';
import chalk from 'chalk';
import { glob } from 'glob';
import Fuse from 'fuse.js';
import { getInteractiveInput } from './cli/interactive-input.js';
import { logger } from './utils/logger.js';
import * as path from 'path';
import * as fs from 'fs/promises';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json');
const VERSION = packageJson.version;

const program = new Command();

// Command definitions
const COMMANDS = [
  { name: '/plan', description: 'Generate an implementation plan (with or without task)' },
  { name: '/export', description: 'Export the current plan as markdown' },
  { name: '/cc', description: 'Start Claude Code with current context' },
  { name: '/security-check', description: 'Run security scan on codebase' },
  { name: '/clear', description: 'Clear conversation and start fresh' },
  { name: '/help', description: 'Show available commands' },
  { name: '/exit', description: 'Exit plnr' },
];

// Cache for file paths
let cachedFiles: string[] = [];
let filesFuse: Fuse<string> | null = null;

// Load project files for @ mentions
async function loadProjectFiles(projectRoot: string): Promise<void> {
  try {
    // Start with fast patterns first for immediate autocomplete
    const patterns = [
      '*.{ts,js,tsx,jsx,json,md}',  // Root files first (fastest)
      'src/**/*',
      'lib/**/*',
      'app/**/*',
      'pages/**/*',
      'components/**/*',
      'utils/**/*',
      'api/**/*'
    ];

    const allFiles = new Set<string>();
    for (const pattern of patterns) {
      try {
        const matches = await glob(pattern, {
          cwd: projectRoot,
          ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**', '.next/**', 'coverage/**'],
          nodir: true,
        });

        // Add to set for deduplication
        matches.forEach(f => allFiles.add(f));

        // Update cache progressively by modifying array in place
        cachedFiles.length = 0;
        cachedFiles.push(...Array.from(allFiles));

        // Update Fuse instance
        filesFuse = new Fuse(cachedFiles, {
          threshold: 0.3,
        });
      } catch {
        // Skip pattern if it fails
      }
    }
  } catch (error) {
    cachedFiles.length = 0;
  }
}


program
  .name('plnr')
  .description('Plan before implementation - AI-powered planning for your codebase')
  .version(VERSION);

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
    console.log(chalk.bold.cyan('\n╔═══════════════════════════════════════════╗'));
    console.log(chalk.bold.cyan('║           ') + chalk.bold.white('plnr') + chalk.bold.cyan(' - Plan First           ║'));
    console.log(chalk.bold.cyan('╚═══════════════════════════════════════════╝'));
    console.log(chalk.dim('\n  Plan before implementation\n'));
    console.log(chalk.gray(`  Version: ${VERSION}`));
    console.log(chalk.gray(`  Model: ${config.model} (via OpenRouter)`));
    console.log(chalk.gray('  Commands: /plan | /export | /cc | /security-check | /exit'));
    console.log(chalk.gray('  Use @ to mention files (e.g., @src/index.ts)\n'));

    const projectRoot = process.cwd();
    let currentPlan: Plan | null = null;
    let currentTask: string | null = null;
    let context: CodebaseContext | null = null;
    let conversationHistory: Array<{task: string, plan: Plan}> = [];

    // Start loading project files in background AFTER prompt renders
    setImmediate(() => {
      loadProjectFiles(projectRoot).catch(() => {});
    });

    // Main loop
    const mainLoop = async () => {
      while (true) {
        try {
          const input = await getInteractiveInput({
            prompt: chalk.bold.cyan('❯ '),
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

        // Handle Claude Code
        if (input.startsWith('/cc')) {
          if (!context) {
            console.log('');
            displayError('No context gathered yet. Ask a question first to gather context.');
            console.log('');
            continue;
          }

          try {
            console.log('');

            // If no plan exists, generate one first
            if (!currentPlan) {
              displayInfo('No plan exists. Generating implementation plan first...');
              console.log('');

              // Ask for task if not provided
              const taskForPlan = currentTask || 'Analyze the codebase and create an implementation plan';

              console.log(chalk.dim('⚡ Generating implementation plan...'));
              currentPlan = await generatePlan(context, taskForPlan, conversationHistory, true);
              currentTask = taskForPlan;

              // Add to history
              conversationHistory.push({ task: taskForPlan, plan: currentPlan });

              // Display the plan
              const planTerminalWidth = process.stdout.columns || 80;
              console.log('\n' + chalk.bold.white('━'.repeat(planTerminalWidth)));
              displayPlan(currentPlan);
              console.log('\n' + chalk.dim('─'.repeat(planTerminalWidth)));
              const planTokensDisplay = currentPlan.tokensUsed
                ? ` • Tokens: ${(currentPlan.tokensUsed / 1000).toFixed(1)}k`
                : '';
              console.log(chalk.dim(`Model: ${config.model}${planTokensDisplay}`));
              console.log(chalk.bold.white('━'.repeat(planTerminalWidth)) + '\n');

              displaySuccess('Plan generated!');
              console.log('');
            }

            displayInfo('Preparing context for Claude Code...');

            // Build context file content
            const contextContent = `# plnr Analysis

## Project Overview
- **Language**: ${context.language}
- **Framework**: ${context.framework || 'None'}
- **Dependencies**: ${context.dependencies.slice(0, 15).join(', ')}${context.dependencies.length > 15 ? '...' : ''}

## Files Analyzed
${context.relevantFiles.map(f => `- \`${f.path}\``).join('\n')}

${currentPlan ? `## Implementation Plan\n\n${currentPlan.summary}\n\n### Steps\n${currentPlan.steps.map((s, i) => `${i + 1}. **${s.title}**: ${s.description}`).join('\n')}` : ''}

---
*Generated by plnr - Plan before implementation*
`;

            // Write context to file
            const contextFilePath = path.join(projectRoot, '.contextengine-context.md');
            await fs.writeFile(contextFilePath, contextContent, 'utf-8');

            // Also export the plan to PRD
            if (currentPlan && currentTask) {
              try {
                const prdFilePath = await exportPRD(currentPlan, currentTask, projectRoot);
                displaySuccess(`Plan exported to: ${prdFilePath}`);
              } catch (error: any) {
                // Continue even if export fails
                logger.debug('Export failed, continuing:', error);
              }
            }

            console.log('');
            displaySuccess(`Context saved to: ${contextFilePath}`);
            displayInfo('Launching Claude Code in new terminal...');

            // Launch Claude Code in new terminal
            const { spawn } = await import('child_process');
            const platform = process.platform;

            if (platform === 'darwin') {
              // macOS - use osascript to open new Terminal window
              spawn('osascript', [
                '-e',
                `tell application "Terminal" to do script "cd ${projectRoot.replace(/"/g, '\\"')} && claude @.contextengine-context.md"`
              ], { detached: true, stdio: 'ignore' }).unref();
            } else if (platform === 'win32') {
              // Windows - use start
              spawn('cmd', ['/c', `start cmd /k "cd /d ${projectRoot} && claude @.contextengine-context.md"`], {
                detached: true,
                stdio: 'ignore',
                shell: true
              }).unref();
            } else {
              // Linux - try common terminal emulators
              const terminals = ['gnome-terminal', 'xterm', 'konsole'];
              for (const term of terminals) {
                try {
                  spawn(term, ['--', 'bash', '-c', `cd ${projectRoot} && claude @.contextengine-context.md; exec bash`], {
                    detached: true,
                    stdio: 'ignore'
                  }).unref();
                  break;
                } catch (e) {
                  continue;
                }
              }
            }

            console.log('');
            displaySuccess('Claude Code starting in new terminal!');
            displayInfo('You can continue using plnr here, or type /exit to quit.\n');
          } catch (error: any) {
            console.log('');
            displayError(`Failed to launch Claude Code: ${error.message}`);
            console.log('');
          }
          continue;
        }

        // Handle security check
        if (input === '/security-check') {
          try {
            console.log('');
            displayInfo('Running security scan...');
            console.log('');
            console.log(chalk.dim('🔍 Scanning for critical vulnerabilities...\n'));

            // Minimal context - just project structure, no file contents
            const minimalContext: CodebaseContext = {
              projectRoot,
              language: context?.language || 'unknown',
              framework: context?.framework || 'unknown',
              dependencies: context?.dependencies || [],
              relevantFiles: [],
              fileTree: ''
            };

            // Ultra-short security prompt optimized for <250K tokens
            const securityPrompt = `Security scan - CRITICAL issues only:

1. Hardcoded secrets (search: API_KEY, SECRET, PASSWORD, TOKEN in source files)
2. Auth issues
3. SQL/XSS injection
4. Insecure endpoints

SKIP: .env files (already secure)
Max 10-15 tool calls. Search first, read only suspicious files.
Output: file:line, issue, risk, fix.`;

            const securityReport = await generatePlan(minimalContext, securityPrompt, [], false);

            // Display results with better formatting
            const terminalWidth = process.stdout.columns || 80;
            console.log('\n' + chalk.bold.red('━'.repeat(terminalWidth)));
            console.log(chalk.bold.red('\n🛡️  SECURITY SCAN REPORT\n'));

            // Parse and format the findings
            const findings = securityReport.summary.split(/\n(?=\.\/)/); // Split by file paths

            if (findings.length > 0 && findings[0].trim()) {
              findings.forEach((finding, index) => {
                const match = finding.match(/^(\.\/[^,]+):(\d+),\s*([^,]+),\s*([^,]+),\s*(.+)$/);

                if (match) {
                  const [, file, line, issue, risk, fix] = match;

                  // Risk level coloring
                  let riskColor = chalk.yellow;
                  if (risk.toLowerCase().includes('critical')) riskColor = chalk.red.bold;
                  else if (risk.toLowerCase().includes('high')) riskColor = chalk.red;
                  else if (risk.toLowerCase().includes('medium')) riskColor = chalk.yellow;
                  else if (risk.toLowerCase().includes('low')) riskColor = chalk.blue;

                  console.log(chalk.cyan(`\n${index + 1}. ${file}:${line}`));
                  console.log(chalk.white(`   Issue: ${issue.trim()}`));
                  console.log(riskColor(`   Risk:  ${risk.trim()}`));
                  console.log(chalk.gray(`   Fix:   ${fix.trim()}`));
                } else {
                  // Fallback for non-standard format
                  if (finding.trim()) {
                    console.log('\n' + chalk.white(finding.trim()));
                  }
                }
              });
            } else {
              console.log(chalk.green('\n✓ No critical security issues found!'));
              console.log(chalk.gray('\nThe codebase appears secure. Consider regular security audits.'));
            }

            console.log('\n' + chalk.dim('─'.repeat(terminalWidth)));
            const tokensDisplay = securityReport.tokensUsed
              ? ` • Tokens: ${(securityReport.tokensUsed / 1000).toFixed(1)}k`
              : '';
            console.log(chalk.dim(`Model: ${config.model}${tokensDisplay}`));
            console.log(chalk.bold.red('━'.repeat(terminalWidth)) + '\n');

            displaySuccess('Security scan complete!');
            console.log('');
          } catch (error: any) {
            console.log('\n');
            displayError(error.message || 'Security scan failed');
            console.log('');
          }
          continue;
        }

        // Handle clear
        if (input === '/clear') {
          console.clear();
          console.log(chalk.bold.cyan('\n╔═══════════════════════════════════════════╗'));
          console.log(chalk.bold.cyan('║           ') + chalk.bold.white('plnr') + chalk.bold.cyan(' - Plan First           ║'));
          console.log(chalk.bold.cyan('╚═══════════════════════════════════════════╝'));
          console.log(chalk.dim('\n  Plan before implementation\n'));
          console.log(chalk.gray(`  Model: ${config.model} (via OpenRouter)`));
          console.log(chalk.gray('  Commands: /plan | /export | /cc | /security-check | /exit'));
          console.log(chalk.gray('  Use @ to mention files (e.g., @src/index.ts)\n'));

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
          console.log('  /plan [task]      - Generate an implementation plan');
          console.log('  /export           - Export the current plan as markdown');
          console.log('  /cc               - Launch Claude Code with gathered context');
          console.log('  /security-check   - Run security scan on codebase');
          console.log('  /clear            - Clear conversation and start fresh');
          console.log('  /help             - Show this help message');
          console.log('  /exit             - Exit plnr');
          console.log('');
          displayInfo('File mentions:');
          console.log('  @file.ts       - Mention a file (use Tab for autocomplete)');
          console.log('  Example: "Explain @src/index.ts"');
          console.log('');
          displayInfo('Keyboard shortcuts:');
          console.log('  Ctrl+C         - Exit plnr');
          console.log('  Tab            - Autocomplete commands and files');
          console.log('  ESC            - Cancel current AI request');
          console.log('');
          displayInfo('Usage:');
          console.log('  Just chat:  "How do I add authentication?"');
          console.log('  Make plan:  "/plan Add JWT authentication"');
          console.log('  With files: "/plan @src/auth.ts Add JWT to this file"');
          console.log('  Security:   "/security-check" (scan for vulnerabilities)');
          console.log('  To Claude:  "/cc" (after gathering context)');
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
            console.log(chalk.dim('⚡ Generating implementation plan...'));
            currentPlan = await generatePlan(context, task, conversationHistory, true);

            // Add to history
            conversationHistory.push({ task, plan: currentPlan });

            // Step 3: Display results
            const planTerminalWidth = process.stdout.columns || 80;
            console.log('\n' + chalk.bold.white('━'.repeat(planTerminalWidth)));
            displayPlan(currentPlan);

            console.log('\n' + chalk.dim('─'.repeat(planTerminalWidth)));
            const planTokensDisplay = currentPlan.tokensUsed
              ? ` • Tokens: ${(currentPlan.tokensUsed / 1000).toFixed(1)}k`
              : '';
            console.log(chalk.dim(`Model: ${config.model}${planTokensDisplay}`));
            console.log(chalk.bold.white('━'.repeat(planTerminalWidth)) + '\n');
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
          console.log(chalk.dim('⚡ Thinking...'));
          const response = await generatePlan(context, input, conversationHistory, false);

          // Add to history
          conversationHistory.push({ task: input, plan: response });

          // Step 3: Display results
          const terminalWidth = process.stdout.columns || 80;
          console.log('\n' + chalk.bold.white('━'.repeat(terminalWidth)));
          console.log(chalk.bold.green('\n✨ Response:\n'));
          console.log(response.summary);

          if (response.steps && response.steps.length > 0) {
            console.log('\n' + chalk.bold.yellow('💡 Suggestions:'));
            response.steps.slice(0, 3).forEach((step, i) => {
              console.log(chalk.gray(`  ${i + 1}. ${step.title}`));
            });
          }

          console.log('\n' + chalk.dim('─'.repeat(terminalWidth)));
          const tokensDisplay = response.tokensUsed
            ? ` • Tokens: ${(response.tokensUsed / 1000).toFixed(1)}k`
            : '';
          console.log(chalk.dim(`Model: ${config.model} ${tokensDisplay}`));
          console.log(chalk.bold.white('━'.repeat(terminalWidth)) + '\n');
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
