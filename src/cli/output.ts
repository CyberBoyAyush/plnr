import chalk from 'chalk';
import { Plan } from '../types/index.js';
import { marked, Tokens, type Token } from 'marked';

const uiWidth = Math.max(40, Math.min(100, (process.stdout.columns || 80) - 8));
const ANSI_REGEX = /\x1b\[[0-9;]*m/g;

function stripAnsi(text: string): string {
  return text.replace(ANSI_REGEX, '');
}

function wrapText(text: string, width: number): string[] {
  const cleanWidth = Math.max(20, width);
  const segments: string[] = [];
  const words = text.split(/\s+/).filter(Boolean);
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (stripAnsi(next).length > cleanWidth && current) {
      segments.push(current);
      current = word;
      continue;
    }
    if (!current && stripAnsi(word).length > cleanWidth) {
      segments.push(word);
      continue;
    }
    current = next;
  }

  if (current) {
    segments.push(current);
  }

  return segments.length ? segments : [''];
}

function renderInline(tokens: Token[] | undefined): string {
  if (!tokens || tokens.length === 0) return '';

  return tokens.map(token => {
    switch (token.type) {
      case 'text': {
        const content = (token as Tokens.Text).text ?? '';
        return token.tokens && token.tokens.length ? renderInline(token.tokens) : content;
      }
      case 'strong':
        return chalk.bold(renderInline((token as Tokens.Strong).tokens));
      case 'em':
        return chalk.italic(renderInline((token as Tokens.Em).tokens));
      case 'codespan':
        return chalk.cyanBright((token as Tokens.Codespan).text);
      case 'link': {
        const linkToken = token as Tokens.Link;
        const label = renderInline(linkToken.tokens);
        const href = linkToken.href ? chalk.dim(` (${linkToken.href})`) : '';
        return chalk.blueBright(label || linkToken.text) + href;
      }
      case 'escape':
        return (token as Tokens.Escape).text;
      case 'br':
        return '\n';
      case 'del':
        return chalk.strikethrough(renderInline((token as Tokens.Del).tokens));
      default:
        return token.raw ?? '';
    }
  }).join('');
}

function renderParagraph(token: Tokens.Paragraph, level: number): string[] {
  const base = (renderInline(token.tokens) || token.text).split('\n');
  const lines: string[] = [];
  const indent = ' '.repeat(level * 2);

  base.forEach(segment => {
    const trimmed = segment.trim();
    if (!trimmed) {
      if (lines[lines.length - 1] !== '') lines.push('');
      return;
    }
    wrapText(trimmed, uiWidth - level * 2).forEach(line => {
      lines.push(`${indent}${line}`);
    });
  });

  return lines;
}

function renderHeading(token: Tokens.Heading): string[] {
  const content = renderInline(token.tokens) || token.text;
  const palette = [chalk.bold.white, chalk.bold.green, chalk.bold.cyan, chalk.bold.magenta, chalk.bold.yellow, chalk.bold];
  const style = palette[Math.min(token.depth - 1, palette.length - 1)];
  return [style(content.trim())];
}

function wrapWithPrefix(text: string, prefix: string): string[] {
  const cleanPrefix = stripAnsi(prefix);
  const hang = ' '.repeat(cleanPrefix.length);
  const width = uiWidth - cleanPrefix.length;
  return wrapText(text.trim(), width).map((line, idx) => (idx === 0 ? prefix + line : hang + line));
}

function isListToken(token: Token): token is Tokens.List {
  return token.type === 'list';
}

function renderList(list: Tokens.List, level: number): string[] {
  const lines: string[] = [];
  const start = typeof list.start === 'number' ? list.start : 1;

  list.items.forEach((item, index) => {
    const marker = list.ordered ? `${start + index}.` : '•';
    const indent = ' '.repeat(level * 2);

    const itemTokens = item.tokens || [];
    const inlineTokens = itemTokens.filter(t => !isListToken(t));
    const nested = itemTokens.filter(isListToken);

    const body = inlineTokens.length ? renderInline(inlineTokens) : item.text;
    const prefix = `${indent}${marker} `;
    lines.push(...wrapWithPrefix(body, prefix));

    nested.forEach(child => {
      lines.push(...renderList(child, level + 1));
    });

    if (list.loose) {
      lines.push('');
    }
  });

  return lines;
}

function renderCode(token: Tokens.Code, level: number): string[] {
  const indent = ' '.repeat(level * 2);
  const title = token.lang ? `${token.lang}` : 'code';
  const header = `${indent}${chalk.dim('┌')} ${chalk.dim(title)}`;
  const body = token.text.split('\n').map(line => `${indent}${chalk.dim('│')} ${chalk.white(line)}`);
  const footer = `${indent}${chalk.dim('└')}`;
  return [header, ...body, footer];
}

function renderBlockquote(token: Tokens.Blockquote, level: number): string[] {
  const nested = renderBlocks(token.tokens, level + 1);
  const prefix = `${' '.repeat(level * 2)}${chalk.dim('│ ')}`;
  return nested.map(line => (line ? prefix + line.trimStart() : ''));
}

function renderBlocks(tokens: Token[], level = 0): string[] {
  const lines: string[] = [];

  tokens.forEach(token => {
    switch (token.type) {
      case 'space':
        if (lines[lines.length - 1] !== '') lines.push('');
        break;
      case 'heading':
        lines.push(...renderHeading(token as Tokens.Heading));
        lines.push('');
        break;
      case 'paragraph':
        lines.push(...renderParagraph(token as Tokens.Paragraph, level));
        lines.push('');
        break;
      case 'list':
        lines.push(...renderList(token as Tokens.List, level));
        lines.push('');
        break;
      case 'code':
        lines.push(...renderCode(token as Tokens.Code, level));
        lines.push('');
        break;
      case 'blockquote':
        lines.push(...renderBlockquote(token as Tokens.Blockquote, level + 1));
        lines.push('');
        break;
      case 'hr':
        lines.push(chalk.dim('─'.repeat(Math.min(uiWidth, (process.stdout.columns || 80) - 4))));
        lines.push('');
        break;
      default:
        lines.push((token.raw || '').trim());
        lines.push('');
    }
  });

  while (lines.length && lines[lines.length - 1] === '') {
    lines.pop();
  }

  const collapsed: string[] = [];
  lines.forEach(line => {
    if (line === '' && collapsed[collapsed.length - 1] === '') {
      return;
    }
    collapsed.push(line);
  });

  return collapsed;
}

function padText(text: string, indent = 2, padTop = 0, padBottom = 0): string {
  const left = ' '.repeat(Math.max(0, indent));
  const body = String(text)
    .split('\n')
    .map(line => (line.length ? left + line : ''))
    .join('\n');
  return (padTop > 0 ? '\n'.repeat(padTop) : '') + body + (padBottom > 0 ? '\n'.repeat(padBottom) : '');
}

export function renderMarkdown(
  markdown: string,
  options: { indent?: number; padTop?: number; padBottom?: number } = {}
): string {
  const { indent = 2, padTop = 0, padBottom = 0 } = options;
  try {
    const tokens = marked.lexer(markdown);
    const renderedLines = renderBlocks(tokens);
    const rendered = renderedLines.join('\n');
    return padText(rendered, indent, padTop, padBottom);
  } catch {
    return padText(markdown, indent, padTop, padBottom); // Fallback to raw text
  }
}

function horizontalLine(width: number): string {
  return '─'.repeat(width);
}

export function displayMarkdownPanel(title: string, markdown: string, indent = 4): void {
  console.log('\n' + chalk.bold.green(title));
  console.log(renderMarkdown(markdown, { indent: Math.max(3, indent), padBottom: 1 }));
}

export function displayPlan(plan: Plan): void {
  const md: string[] = [];
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
  displayMarkdownPanel('📋 Implementation Plan', md.join('\n'), 2);
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
  console.log(centerText(chalk.dim('Tip: Press Ctrl+J for a new line in the prompt'), terminalWidth));

  console.log('\n');
}
