import * as readline from 'readline';
import chalk from 'chalk';
import Fuse from 'fuse.js';

interface Command {
  name: string;
  description: string;
}

interface InteractiveInputOptions {
  prompt: string;
  commands: Command[];
  files: string[];
  filesFuse: Fuse<string> | null;
}

interface Suggestion {
  value: string;
  display?: string;
  description?: string;
}

export async function getInteractiveInput(options: InteractiveInputOptions): Promise<string> {
  return new Promise((resolve) => {
    const { prompt: promptText, commands, files, filesFuse } = options;

    // Calculate visible prompt length (without ANSI codes)
    const stripAnsi = (str: string) => str.replace(/\x1b\[[0-9;]*m/g, '');
    const visiblePromptLength = stripAnsi(promptText).length;

    let inputBuffer = '';
    let cursorPosition = 0;
    let suggestions: Suggestion[] = [];
    let selectedIndex = 0;
    let showMenu = false;

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
    process.stdin.resume();

    const cleanup = () => {
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
    let lastBoxLines = 0;
    let lastCursorLine = 0; // Track which line the cursor is on

    const render = () => {
      const termWidth = process.stdout.columns || 80;
      const contentWidth = termWidth - 2 - PADDING_LEFT - PADDING_RIGHT; // 2 for left/right borders
      const fullText = promptText + inputBuffer;
      const visibleFullLength = stripAnsi(fullText).length;
      
      // Calculate how many lines we need for wrapped text
      const contentLines = Math.max(1, Math.ceil(visibleFullLength / contentWidth));
      const totalBoxLines = contentLines + 2; // +2 for top and bottom borders

      // Clear previous menu if it exists
      if (lastMenuLines > 0) {
        for (let i = 0; i < lastMenuLines; i++) {
          readline.moveCursor(process.stdout, 0, 1);
          readline.clearLine(process.stdout, 0);
        }
        readline.moveCursor(process.stdout, 0, -lastMenuLines);
      }

      // Clear previous box by moving cursor back and clearing lines
      if (lastBoxLines > 0) {
        // Cursor is currently at lastCursorLine within the box
        // Move to the top of the box
        readline.cursorTo(process.stdout, 0);
        readline.moveCursor(process.stdout, 0, -lastCursorLine);
        
        // Clear all lines of the box
        for (let i = 0; i < lastBoxLines; i++) {
          readline.clearLine(process.stdout, 0);
          if (i < lastBoxLines - 1) {
            readline.moveCursor(process.stdout, 0, 1);
          }
        }
        
        // Move cursor back to top
        readline.moveCursor(process.stdout, 0, -(lastBoxLines - 1));
        readline.cursorTo(process.stdout, 0);
      }

      // Draw top border
      const topBorder = BORDER_CHAR_TOP_LEFT + BORDER_CHAR_HORIZONTAL.repeat(termWidth - 2) + BORDER_CHAR_TOP_RIGHT;
      process.stdout.write(chalk.gray(topBorder));

      // Prepare content with word wrapping
      let remainingText = fullText;
      let remainingVisible = stripAnsi(fullText);
      
      for (let line = 0; line < contentLines; line++) {
        // Move to next line
        readline.moveCursor(process.stdout, 0, 1);
        readline.cursorTo(process.stdout, 0);
        
        const leftBorder = chalk.gray(BORDER_CHAR_VERTICAL) + ' '.repeat(PADDING_LEFT);
        const rightBorder = ' '.repeat(PADDING_RIGHT) + chalk.gray(BORDER_CHAR_VERTICAL);
        
        // Extract text for this line
        let lineText = '';
        let visibleLength = 0;
        let charIndex = 0;
        let textIndex = 0;
        
        while (visibleLength < contentWidth && textIndex < remainingText.length) {
          // Check if we're in an ANSI code
          if (remainingText[textIndex] === '\x1b') {
            // Find the end of ANSI code
            let ansiEnd = textIndex;
            while (ansiEnd < remainingText.length && remainingText[ansiEnd] !== 'm') {
              ansiEnd++;
            }
            ansiEnd++; // Include the 'm'
            lineText += remainingText.substring(textIndex, ansiEnd);
            textIndex = ansiEnd;
          } else {
            lineText += remainingText[textIndex];
            visibleLength++;
            textIndex++;
          }
        }
        
        const padding = ' '.repeat(Math.max(0, contentWidth - stripAnsi(lineText).length));
        process.stdout.write(leftBorder + lineText + padding + rightBorder);
        
        // Update remaining text
        remainingText = remainingText.substring(textIndex);
      }

      // Draw bottom border
      readline.moveCursor(process.stdout, 0, 1);
      readline.cursorTo(process.stdout, 0);
      const bottomBorder = BORDER_CHAR_BOTTOM_LEFT + BORDER_CHAR_HORIZONTAL.repeat(termWidth - 2) + BORDER_CHAR_BOTTOM_RIGHT;
      process.stdout.write(chalk.gray(bottomBorder));

      lastBoxLines = totalBoxLines;

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

      // Position cursor within the bordered box
      const cursorOffset = visiblePromptLength + cursorPosition;
      const cursorLine = Math.floor(cursorOffset / contentWidth);
      const cursorCol = cursorOffset % contentWidth;
      
      // The cursor line we want to be on (1 for top border, then cursorLine content lines)
      const targetLineInBox = 1 + cursorLine;
      
      // Move cursor from bottom border to the correct content line
      // Bottom border is at line (totalBoxLines - 1), we want line targetLineInBox
      readline.cursorTo(process.stdout, 0);
      readline.moveCursor(process.stdout, 0, -(totalBoxLines - 1 - targetLineInBox));
      readline.moveCursor(process.stdout, 1 + PADDING_LEFT + cursorCol, 0);
      
      // Remember where the cursor is for next render
      lastCursorLine = targetLineInBox;
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

      // Handle Enter
      if (key.name === 'return') {
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
        resolve(inputBuffer);
        return;
      }

      // Handle Tab - cycle through suggestions
      if (key.name === 'tab') {
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
        suggestions = getSuggestions(inputBuffer);
        showMenu = suggestions.length > 0;
        selectedIndex = 0;
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
          suggestions = getSuggestions(inputBuffer);
          showMenu = suggestions.length > 0;
          selectedIndex = 0;
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
            suggestions = getSuggestions(inputBuffer);
            showMenu = suggestions.length > 0;
            selectedIndex = 0;
            render();
          }
        } else if (cursorPosition > 0) {
          inputBuffer = inputBuffer.slice(0, cursorPosition - 1) + inputBuffer.slice(cursorPosition);
          cursorPosition--;
          suggestions = getSuggestions(inputBuffer);
          showMenu = suggestions.length > 0;
          selectedIndex = 0;
          render();
        }
        return;
      }

      // Handle Delete
      if (key.name === 'delete') {
        if (cursorPosition < inputBuffer.length) {
          inputBuffer = inputBuffer.slice(0, cursorPosition) + inputBuffer.slice(cursorPosition + 1);
          suggestions = getSuggestions(inputBuffer);
          showMenu = suggestions.length > 0;
          selectedIndex = 0;
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
        inputBuffer = inputBuffer.slice(0, cursorPosition) + key.sequence + inputBuffer.slice(cursorPosition);
        cursorPosition++;

        // Check if we should show menu
        const newSuggestions = getSuggestions(inputBuffer);
        suggestions = newSuggestions;
        showMenu = suggestions.length > 0;
        selectedIndex = 0;

        render();
      }
    };

    process.stdin.on('keypress', handleKeypress);

    // Initial render - show bordered box
    render();
  });
}
