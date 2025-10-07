import chalk from 'chalk';
import { Plan } from '../types/index.js';
import { marked } from 'marked';
import { markedTerminal } from 'marked-terminal';

// Configure marked with terminal renderer - minimal, readable colors
marked.use(markedTerminal({
  code: chalk.white,
  blockquote: chalk.dim.italic,
  heading: chalk.bold.white,
  list: chalk.white,
  listitem: chalk.white,
  strong: chalk.bold.white,
  em: chalk.italic.gray,
  codespan: chalk.cyan,
  link: chalk.cyan.underline,
}) as any);

export function renderMarkdown(markdown: string): string {
  try {
    return marked(markdown) as string;
  } catch {
    return markdown; // Fallback to raw text
  }
}

export function displayPlan(plan: Plan): void {
  console.log('\n' + chalk.bold.white('📋 Implementation Plan') + '\n');
  console.log(chalk.bold.white('Summary:'));
  console.log('  ' + chalk.white(plan.summary) + '\n');

  console.log(chalk.bold.white('Steps:'));
  plan.steps.forEach((step, index) => {
    console.log(chalk.white(`\n  ${index + 1}. ${step.title}`));
    console.log(chalk.dim('     ' + step.description));

    if (step.files_to_modify.length > 0) {
      console.log(chalk.dim('     Modify: ' + step.files_to_modify.join(', ')));
    }
    if (step.files_to_create.length > 0) {
      console.log(chalk.dim('     Create: ' + step.files_to_create.join(', ')));
    }
  });

  if (plan.dependencies_to_add.length > 0) {
    console.log('\n' + chalk.bold.white('📦 Dependencies:'));
    plan.dependencies_to_add.forEach(dep => {
      console.log(chalk.white('  • ' + dep));
    });
  }

  if (plan.risks.length > 0) {
    console.log('\n' + chalk.bold.white('⚠️  Risks:'));
    plan.risks.forEach(risk => {
      console.log(chalk.dim('  • ' + risk));
    });
  }

  console.log('');
}

export function displaySuccess(message: string): void {
  console.log(chalk.white('✓ ' + message));
}

export function displayError(message: string): void {
  console.error(chalk.white('✗ ' + message));
}

export function displayInfo(message: string): void {
  console.log(chalk.white('→ ' + message));
}

// Center text in terminal
function centerText(text: string, width: number): string {
  // Remove ANSI codes to calculate real length
  const cleanText = text.replace(/\x1b\[[0-9;]*m/g, '');
  const padding = Math.max(0, Math.floor((width - cleanText.length) / 2));
  return ' '.repeat(padding) + text;
}

// Justify text - left and right aligned with space between
export function justifyText(left: string, right: string): string {
  const terminalWidth = process.stdout.columns || 80;
  const maxWidth = terminalWidth - 4; // Leave 2 spaces on each side

  // Remove ANSI codes to calculate real length
  const cleanLeft = left.replace(/\x1b\[[0-9;]*m/g, '');
  const cleanRight = right.replace(/\x1b\[[0-9;]*m/g, '');

  const totalContentLength = cleanLeft.length + cleanRight.length;
  const spaceBetween = Math.max(2, maxWidth - totalContentLength);

  return '  ' + left + ' '.repeat(spaceBetween) + right;
}

// Create divider line
export function divider(color: any = chalk.dim): string {
  const terminalWidth = process.stdout.columns || 80;
  const lineWidth = terminalWidth - 4; // Leave 2 spaces on each side
  return '  ' + color('─'.repeat(lineWidth));
}

// Display minimal centered welcome screen
export function displayWelcome(version: string, model: string): void {
  const terminalWidth = process.stdout.columns || 80;

  console.log('\n');

  // Simple centered title
  const title = chalk.bold.white('plnr') + chalk.dim(' · Plan First');
  console.log(centerText(title, terminalWidth));

  // Tagline
  console.log(centerText(chalk.dim('Plan before implementation'), terminalWidth));

  // Divider
  console.log(centerText(chalk.dim('─'.repeat(50)), terminalWidth));

  // Info line
  console.log(centerText(chalk.dim(`v${version} • ${model}`), terminalWidth));

  // Commands in one line
  console.log(centerText(chalk.white('/plan') + chalk.dim(' | ') + chalk.white('/export') + chalk.dim(' | ') + chalk.white('/cc') + chalk.dim(' | ') + chalk.white('/clear'), terminalWidth));

  console.log('\n');
}
