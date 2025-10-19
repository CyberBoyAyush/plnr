import * as readline from 'readline';
import chalk from 'chalk';
import Fuse from 'fuse.js';
import { enhancePrompt } from '../utils/prompt-enhancer.js';

interface Command {
  name: string;
  description: string;
}

interface InteractiveInputOptions {
  prompt: string;
  commands: Command[];
  files: string[];
  filesFuse: Fuse<string> | null;
  currentMode?: InputMode; // Pass in the current mode to persist it
}

interface Suggestion {
  value: string;
  display?: string;
  description?: string;
}

export type InputMode = 'plan' | 'chat';

export interface InteractiveInputResult {
  input: string;
  mode: InputMode;
}

export async function getInteractiveInput(options: InteractiveInputOptions): Promise<InteractiveInputResult> {
  return new Promise((resolve) => {
    const { prompt: promptText, commands, files, filesFuse, currentMode: initialMode } = options;

    // Calculate visible prompt length (without ANSI codes)
    const stripAnsi = (str: string) => str.replace(/\x1b\[[0-9;]*m/g, '');
    const visiblePromptLength = stripAnsi(promptText).length;

    let inputBuffer = '';
    let cursorPosition = 0;
    let suggestions: Suggestion[] = [];
    let selectedIndex = 0;
    let showMenu = false;
    let currentMode: InputMode = initialMode || 'chat'; // Default to chat mode, or use passed mode
    let isEnhancing = false; // Track if we're currently enhancing

    // Border box configuration
    const PADDING_LEFT = 1;
    const PADDING_RIGHT = 2;
    const BORDER_CHAR_HORIZONTAL = '─';
    const BORDER_CHAR_VERTICAL = '│';
    const BORDER_CHAR_TOP_LEFT = '╭';
    const BORDER_CHAR_TOP_RIGHT = '╮';
    const BORDER_CHAR_BOTTOM_LEFT = '╰';
    const BORDER_CHAR_BOTTOM_RIGHT = '╯';

    // Setup readline for raw input
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    const cleanup = () => {
      // Don't clear the display - keep it visible for scrollback
      // Just show cursor and move to end
      process.stdout.write('\x1b[?25h'); // Show cursor
      
      // Move cursor to the end (after mode line) for clean output
      if (lastTotalLines > 0 && lastCursorPosition > 0) {
        try {
          readline.cursorTo(process.stdout, 0);
          const linesToMoveDown = (lastTotalLines - 1) - lastCursorPosition;
          if (linesToMoveDown > 0) {
            readline.moveCursor(process.stdout, 0, linesToMoveDown);
          }
        } catch {}
      }
      
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdin.removeAllListeners('keypress');
      // Don't pause stdin - we need it for the next iteration
    };

    const getSuggestions = (input: string): Suggestion[] => {
      // For / commands - only at the start and no space yet
      if (input.startsWith('/') && !input.includes(' ')) {
        const query = input.substring(1);
        const matches = commands.filter(c => c.name.substring(1).startsWith(query));
        return matches.map(c => ({ value: c.name, display: c.name, description: c.description }));
      }

      // For @ file mentions - check the text after last @
      const lastAtIndex = input.lastIndexOf('@');
      if (lastAtIndex !== -1) {
        const afterAt = input.substring(lastAtIndex + 1);
        const beforeAt = input.substring(0, lastAtIndex);

        // Check if we're still typing after @ (no space after @)
        const afterAtParts = afterAt.split(' ');
        if (afterAtParts.length === 1) {
          const searchTerm = afterAtParts[0];

          if (!searchTerm) {
            return files.slice(0, 10).map(f => ({
              value: beforeAt + '@' + f,
              display: f,
              description: ''
            }));
          }

          let matchingFiles: string[] = [];
          if (filesFuse) {
            const results = filesFuse.search(searchTerm, { limit: 10 });
            matchingFiles = results.map(r => r.item);
          } else {
            matchingFiles = files
              .filter(f => f.toLowerCase().includes(searchTerm.toLowerCase()))
              .slice(0, 10);
          }

          return matchingFiles.map(f => ({
            value: beforeAt + '@' + f,
            display: f,
            description: ''
          }));
        }
      }

      return [];
    };

    let lastMenuLines = 0;
    let lastTotalLines = 0; // Total lines rendered (box + mode indicator)
    let lastCursorPosition = 0; // Where cursor was actually left (0-indexed line from top)

    const promptIndent = visiblePromptLength > 0 ? ' '.repeat(visiblePromptLength) : '';

    const layoutContent = (text: string, width: number, cursorIndex: number) => {
      const safeWidth = Math.max(1, width);
      const lines: string[] = [];
      let useIndent = false;
      let line = '';
      let visible = 0;
      let index = 0;
      let cursorLine = 0;
      let cursorCol = 0;
      let cursorCaptured = false;

      const resetLine = () => {
        line = useIndent ? promptIndent : '';
        visible = useIndent ? visiblePromptLength : 0;
      };

      const pushLine = () => {
        lines.push(line);
        useIndent = true;
        resetLine();
      };

      resetLine();

      while (index < text.length) {
        if (!cursorCaptured && index === cursorIndex) {
          cursorLine = lines.length;
          cursorCol = visible;
          cursorCaptured = true;
        }

        const char = text[index];

        if (char === '\n') {
          index++;
          pushLine();
          continue;
        }

        if (char === '\r') {
          index++;
          continue;
        }

        if (char === '\x1b') {
          let end = index + 1;
          while (end < text.length && text[end] !== 'm') {
            end++;
          }
          end = Math.min(end + 1, text.length);
          line += text.slice(index, end);
          index = end;
          continue;
        }

        line += char;
        visible++;
        index++;

        if (visible >= safeWidth) {
          pushLine();
        }
      }

      if (!cursorCaptured && index === cursorIndex) {
        cursorLine = lines.length;
        cursorCol = visible;
        cursorCaptured = true;
      }

      if (line || lines.length === 0) {
        lines.push(line);
      }

      if (!cursorCaptured) {
        const lastLine = lines.length ? lines.length - 1 : 0;
        cursorLine = lastLine;
        cursorCol = Math.min(visible, safeWidth - 1);
      }

      return { lines, cursorLine, cursorCol };
    };

    const render = () => {
      // Hide cursor during rendering to avoid visual glitches
      process.stdout.write('\x1b[?25l');
      
      const termWidth = process.stdout.columns || 80;
      const contentWidth = Math.max(1, termWidth - 2 - PADDING_LEFT - PADDING_RIGHT); // 2 for left/right borders
      const stripAnsi = (str: string) => str.replace(/\x1b\[[0-9;]*m/g, '');
      const fullText = promptText + inputBuffer;
      const cursorIndex = promptText.length + cursorPosition;
      const { lines: contentLinesArr, cursorLine, cursorCol } = layoutContent(fullText, contentWidth, cursorIndex);
      const displayLines = contentLinesArr.length > 0 ? contentLinesArr : [''];
      const totalBoxLines = displayLines.length + 2; // +2 for top and bottom borders
      const totalLinesWithMode = totalBoxLines + 1; // +1 for mode line

      // Clear previous menu if it exists
      if (lastMenuLines > 0) {
        for (let i = 0; i < lastMenuLines; i++) {
          readline.moveCursor(process.stdout, 0, 1);
          readline.clearLine(process.stdout, 0);
        }
        readline.moveCursor(process.stdout, 0, -lastMenuLines);
      }

      // Clear previous render by moving back to start
      if (lastTotalLines > 0) {
        // Move cursor to column 0
        readline.cursorTo(process.stdout, 0);
        
        // Move up to the start - cursor is at lastCursorPosition
        if (lastCursorPosition > 0) {
          readline.moveCursor(process.stdout, 0, -lastCursorPosition);
        }
        
        // Clear everything from here down
        readline.clearScreenDown(process.stdout);
      }

      // Draw top border
      const topBorder = BORDER_CHAR_TOP_LEFT + BORDER_CHAR_HORIZONTAL.repeat(termWidth - 2) + BORDER_CHAR_TOP_RIGHT;
      process.stdout.write(chalk.gray(topBorder));

      // Prepare content with word wrapping
      displayLines.forEach((lineText) => {
        readline.moveCursor(process.stdout, 0, 1);
        readline.cursorTo(process.stdout, 0);

        const leftBorder = chalk.gray(BORDER_CHAR_VERTICAL) + ' '.repeat(PADDING_LEFT);
        const rightBorder = ' '.repeat(PADDING_RIGHT) + chalk.gray(BORDER_CHAR_VERTICAL);
        const padding = ' '.repeat(Math.max(0, contentWidth - stripAnsi(lineText).length));
        process.stdout.write(leftBorder + lineText + padding + rightBorder);
      });

      // Draw bottom border
      readline.moveCursor(process.stdout, 0, 1);
      readline.cursorTo(process.stdout, 0);
      const bottomBorder = BORDER_CHAR_BOTTOM_LEFT + BORDER_CHAR_HORIZONTAL.repeat(termWidth - 2) + BORDER_CHAR_BOTTOM_RIGHT;
      process.stdout.write(chalk.gray(bottomBorder));

      // Display mode indicator below the box
      readline.moveCursor(process.stdout, 0, 1);
      readline.cursorTo(process.stdout, 0);
      let modeText;
      if (isEnhancing) {
        modeText = chalk.yellow('  ⚡ Enhancing prompt...');
      } else {
        modeText = currentMode === 'plan'
          ? chalk.cyan('  Mode: ') + chalk.bold.cyan('Plan') + chalk.gray(' (Shift+Tab to switch, Ctrl+P to enhance)')
          : chalk.magenta('  Mode: ') + chalk.bold.magenta('Chat') + chalk.gray(' (Shift+Tab to switch, Ctrl+P to enhance)');
      }
      process.stdout.write(modeText);
      
      // Now cursor is at the END of mode line (last line rendered)

      // Show menu if needed
      if (showMenu && suggestions.length > 0) {
        const displayCount = Math.min(suggestions.length, 10);
        lastMenuLines = displayCount;

        process.stdout.write('\n');

        for (let i = 0; i < displayCount; i++) {
          const suggestion = suggestions[i];
          const isSelected = i === selectedIndex;
          const displayText = suggestion.display || suggestion.value;

          readline.clearLine(process.stdout, 0);

          if (isSelected) {
            process.stdout.write(chalk.bgCyan.black('❯ ' + displayText));
            if (suggestion.description) {
              process.stdout.write(' ' + chalk.gray(suggestion.description));
            }
          } else {
            process.stdout.write('  ' + chalk.gray(displayText));
            if (suggestion.description) {
              process.stdout.write(' ' + chalk.gray(suggestion.description));
            }
          }

          if (i < displayCount - 1) {
            process.stdout.write('\n');
          }
        }

        readline.moveCursor(process.stdout, 0, -displayCount);
      } else {
        lastMenuLines = 0;
      }

      // Position cursor within the bordered box for user input
      const safeCursorLine = Math.max(0, Math.min(cursorLine, displayLines.length - 1));
      const safeCursorCol = Math.max(0, Math.min(cursorCol, Math.max(0, contentWidth - 1)));
      const targetLine = 1 + safeCursorLine; // 0-indexed: 0=top border, 1=first content line

      // We're currently at end of mode line, which is line (totalLinesWithMode - 1) in 0-indexed
      // Move up to target line
      const currentLine = totalLinesWithMode - 1;
      const linesToMoveUp = currentLine - targetLine;
      
      readline.cursorTo(process.stdout, 0);
      if (linesToMoveUp > 0) {
        readline.moveCursor(process.stdout, 0, -linesToMoveUp);
      }
      readline.moveCursor(process.stdout, 1 + PADDING_LEFT + safeCursorCol, 0);

      // Remember state for next render
      lastTotalLines = totalLinesWithMode;
      lastCursorPosition = targetLine; // Cursor is now at this line (0-indexed)
      
      // Show cursor again
      process.stdout.write('\x1b[?25h');
    };

    const updateSuggestionsState = () => {
      suggestions = getSuggestions(inputBuffer);
      showMenu = suggestions.length > 0;
      selectedIndex = 0;
    };

    const insertTextAtCursor = (text: string) => {
      if (!text) return;
      inputBuffer = inputBuffer.slice(0, cursorPosition) + text + inputBuffer.slice(cursorPosition);
      cursorPosition += text.length;
      updateSuggestionsState();
      render();
    };

    const handleKeypress = (str: string, key: readline.Key) => {
      if (!key) return;

      // Debug: log key info (remove this later)
      // console.log('\nKey:', JSON.stringify({ name: key.name, ctrl: key.ctrl, meta: key.meta, shift: key.shift, sequence: key.sequence }));

      // Handle Ctrl+C
      if (key.ctrl && key.name === 'c') {
        cleanup();
        process.stdout.write('\n');
        process.exit(0);
      }

      // Handle Ctrl+P - Enhance prompt
      if (key.ctrl && key.name === 'p') {
        // Only enhance if there's input
        if (inputBuffer.trim().length === 0) {
          return;
        }

        // Don't enhance commands
        if (inputBuffer.trim().startsWith('/')) {
          return;
        }

        // Don't enhance if already enhancing
        if (isEnhancing) {
          return;
        }

        // Save original input
        const originalInput = inputBuffer;

        // Set enhancing flag and show status in mode line
        isEnhancing = true;
        showMenu = false;
        render();

        // Temporarily disable keypress handling during enhancement
        process.stdin.removeListener('keypress', handleKeypress);

        enhancePrompt(originalInput)
          .then((enhanced) => {
            // Update input buffer with enhanced text
            inputBuffer = enhanced;
            // Place cursor at the end so user can immediately edit/add more
            cursorPosition = enhanced.length;
            isEnhancing = false;
            updateSuggestionsState();

            // Re-enable keypress handling
            process.stdin.on('keypress', handleKeypress);

            // Render the enhanced prompt
            render();
          })
          .catch((error) => {
            // On error, restore original input
            inputBuffer = originalInput;
            cursorPosition = originalInput.length;
            isEnhancing = false;
            updateSuggestionsState();

            // Re-enable keypress handling
            process.stdin.on('keypress', handleKeypress);

            // Render with original text
            render();
          });

        return;
      }

      if (key.ctrl && (key.name === 'j' || key.sequence === '\n')) {
        insertTextAtCursor('\n');
        return;
      }

      // Handle Enter
      if (key.name === 'return') {
        if (key.ctrl) {
          insertTextAtCursor('\n');
          return;
        }
        if (showMenu && suggestions.length > 0 && selectedIndex >= 0) {
          // Fill input with selected suggestion and close menu
          inputBuffer = suggestions[selectedIndex].value;
          showMenu = false;
          render();
          return;
        }

        // If menu is closed or no suggestions, submit
        cleanup();
        process.stdout.write('\n');
        resolve({ input: inputBuffer, mode: currentMode });
        return;
      }

      // Handle Tab - cycle through suggestions or toggle mode with Shift
      if (key.name === 'tab') {
        if (key.shift) {
          // Shift+Tab: Toggle mode
          currentMode = currentMode === 'plan' ? 'chat' : 'plan';
          render();
          return;
        }
        
        if (showMenu && suggestions.length > 0) {
          selectedIndex = selectedIndex < suggestions.length - 1 ? selectedIndex + 1 : 0;
          // Update input buffer to show selected item
          inputBuffer = suggestions[selectedIndex].value;
          render();
        }
        return;
      }

      // Handle arrow keys when menu is showing
      if (showMenu && suggestions.length > 0) {
        if (key.name === 'up') {
          selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : suggestions.length - 1;
          // Update input buffer to show selected item
          inputBuffer = suggestions[selectedIndex].value;
          cursorPosition = inputBuffer.length;
          render();
          return;
        }

        if (key.name === 'down') {
          selectedIndex = selectedIndex < suggestions.length - 1 ? selectedIndex + 1 : 0;
          // Update input buffer to show selected item
          inputBuffer = suggestions[selectedIndex].value;
          cursorPosition = inputBuffer.length;
          render();
          return;
        }
      }

      // Handle Ctrl+A: beginning of line
      if (key.ctrl && key.name === 'a') {
        cursorPosition = 0;
        render();
        return;
      }

      // Handle Ctrl+E: end of line
      if (key.ctrl && key.name === 'e') {
        cursorPosition = inputBuffer.length;
        render();
        return;
      }

      // Handle left/right arrow keys for cursor movement
      if (key.name === 'left') {
        if (key.meta) {
          // Alt/Option + Left: Move to previous word
          if (cursorPosition > 0) {
            let pos = cursorPosition - 1;
            while (pos > 0 && inputBuffer[pos] === ' ') pos--;
            while (pos > 0 && inputBuffer[pos - 1] !== ' ') pos--;
            cursorPosition = pos;
            render();
          }
        } else if (cursorPosition > 0) {
          cursorPosition--;
          render();
        }
        return;
      }

      if (key.name === 'right') {
        if (key.meta) {
          // Alt/Option + Right: Move to next word
          if (cursorPosition < inputBuffer.length) {
            let pos = cursorPosition;
            while (pos < inputBuffer.length && inputBuffer[pos] !== ' ') pos++;
            while (pos < inputBuffer.length && inputBuffer[pos] === ' ') pos++;
            cursorPosition = pos;
            render();
          }
        } else if (cursorPosition < inputBuffer.length) {
          cursorPosition++;
          render();
        }
        return;
      }

      // Handle Ctrl+U: Clear entire line
      if (key.ctrl && key.name === 'u') {
        inputBuffer = '';
        cursorPosition = 0;
        updateSuggestionsState();
        render();
        return;
      }

      // Handle Ctrl+W: Delete word before cursor
      if (key.ctrl && key.name === 'w') {
        if (cursorPosition > 0) {
          let pos = cursorPosition - 1;
          while (pos > 0 && inputBuffer[pos] === ' ') pos--;
          while (pos > 0 && inputBuffer[pos - 1] !== ' ') pos--;
          inputBuffer = inputBuffer.slice(0, pos) + inputBuffer.slice(cursorPosition);
          cursorPosition = pos;
          updateSuggestionsState();
          render();
        }
        return;
      }

      // Handle Backspace (including Alt+Backspace for word delete)
      if (key.name === 'backspace') {
        if (key.meta) {
          // Alt/Option + Backspace: Delete word before cursor
          if (cursorPosition > 0) {
            let pos = cursorPosition - 1;
            while (pos > 0 && inputBuffer[pos] === ' ') pos--;
            while (pos > 0 && inputBuffer[pos - 1] !== ' ') pos--;
            inputBuffer = inputBuffer.slice(0, pos) + inputBuffer.slice(cursorPosition);
            cursorPosition = pos;
            updateSuggestionsState();
            render();
          }
        } else if (cursorPosition > 0) {
          inputBuffer = inputBuffer.slice(0, cursorPosition - 1) + inputBuffer.slice(cursorPosition);
          cursorPosition--;
          updateSuggestionsState();
          render();
        }
        return;
      }

      // Handle Delete
      if (key.name === 'delete') {
        if (cursorPosition < inputBuffer.length) {
          inputBuffer = inputBuffer.slice(0, cursorPosition) + inputBuffer.slice(cursorPosition + 1);
          updateSuggestionsState();
          render();
        }
        return;
      }

      // Handle Escape
      if (key.name === 'escape') {
        showMenu = false;
        render();
        return;
      }

      // Handle regular character input
      if (key.sequence && key.sequence.length === 1 && !key.ctrl && !key.meta) {
        insertTextAtCursor(key.sequence);
      }
    };

    process.stdin.on('keypress', handleKeypress);

    // Resume stdin and render on next tick to ensure everything is ready
    process.stdin.resume();
    process.nextTick(() => {
      // Start fresh
      process.stdout.write('\n');
      readline.cursorTo(process.stdout, 0);
      
      // Reset state and render
      lastTotalLines = 0;
      lastCursorPosition = 0;
      render();
      setTimeout(render, 0);
    });
  });
}
