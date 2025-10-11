import chalk from 'chalk';
import { Plan } from '../types/index.js';
import { marked } from 'marked';
import { markedTerminal } from 'marked-terminal';

// Configure marked with terminal renderer - minimal, readable colors
marked.use(markedTerminal({
  code: chalk.white,
  blockquote: chalk.dim.italic,
  heading: chalk.bold.green, // more readable section headers
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
  const md: string[] = [];
  md.push('# 📋 Implementation Plan');
  md.push('');
  md.push('## Summary');
  md.push(plan.summary.trim());
  md.push('');
  if (plan.steps.length > 0) {
    md.push('## Steps');
    plan.steps.forEach((s, i) => {
      md.push(`- **${i + 1}. ${s.title}**`);
      if (s.description) md.push(`  - ${s.description}`);
      if (s.files_to_modify?.length) md.push(`  - Modify: ${s.files_to_modify.join(', ')}`);
      if (s.files_to_create?.length) md.push(`  - Create: ${s.files_to_create.join(', ')}`);
    });
    md.push('');
  }
  if (plan.dependencies_to_add.length > 0) {
    md.push('## Dependencies');
    plan.dependencies_to_add.forEach(dep => md.push(`- ${dep}`));
    md.push('');
  }
  if (plan.risks.length > 0) {
    md.push('## Risks');
    plan.risks.forEach(r => md.push(`- ${r}`));
    md.push('');
  }
  console.log('\n' + renderMarkdown(md.join('\n')));
}

export function displaySuccess(message: string): void {
  console.log(chalk.green('✓ ') + chalk.white(message));
}

export function displayError(message: string): void {
  console.error(chalk.red('✗ ') + chalk.white(message));
}

export function displayInfo(message: string): void {
  console.log(chalk.cyan('→ ') + chalk.white(message));
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
