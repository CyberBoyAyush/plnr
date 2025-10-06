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

export async function getInteractiveInput(options: InteractiveInputOptions): Promise<string> {
  return new Promise((resolve) => {
    const { prompt: promptText, commands, files, filesFuse } = options;

    // Calculate visible prompt length (without ANSI codes)
    const stripAnsi = (str: string) => str.replace(/\x1b\[[0-9;]*m/g, '');
    const visiblePromptLength = stripAnsi(promptText).length;

    let inputBuffer = '';
    let suggestions: Array<{ value: string; description?: string }> = [];
    let selectedIndex = 0;
    let showMenu = false;

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

    const getSuggestions = (input: string): Array<{ value: string; description?: string }> => {
      // For / commands
      if (input.startsWith('/')) {
        const query = input.substring(1);
        const matches = commands.filter(c => c.name.substring(1).startsWith(query));
        return matches.map(c => ({ value: c.name, description: c.description }));
      }

      // For @ file mentions
      const lastAtIndex = input.lastIndexOf('@');
      if (lastAtIndex !== -1) {
        const afterAt = input.substring(lastAtIndex + 1);
        const beforeAt = input.substring(0, lastAtIndex);

        if (!afterAt) {
          return files.slice(0, 10).map(f => ({ value: beforeAt + '@' + f }));
        }

        let matchingFiles: string[] = [];
        if (filesFuse) {
          const results = filesFuse.search(afterAt, { limit: 10 });
          matchingFiles = results.map(r => r.item);
        } else {
          matchingFiles = files
            .filter(f => f.toLowerCase().includes(afterAt.toLowerCase()))
            .slice(0, 10);
        }

        return matchingFiles.map(f => ({ value: beforeAt + '@' + f }));
      }

      return [];
    };

    let lastMenuLines = 0;

    const render = () => {
      // Clear previous menu if it exists
      if (lastMenuLines > 0) {
        // Go to first menu line
        readline.moveCursor(process.stdout, 0, 1);
        // Clear all menu lines
        for (let i = 0; i < lastMenuLines; i++) {
          readline.clearLine(process.stdout, 0);
          if (i < lastMenuLines - 1) {
            readline.moveCursor(process.stdout, 0, 1);
          }
        }
        // Move back to input line
        readline.moveCursor(process.stdout, 0, -(lastMenuLines));
      }

      // Clear and redraw input line
      readline.cursorTo(process.stdout, 0);
      readline.clearLine(process.stdout, 0);
      process.stdout.write(promptText + inputBuffer);

      // Show menu if needed
      if (showMenu && suggestions.length > 0) {
        const displayCount = Math.min(suggestions.length, 10);
        lastMenuLines = displayCount;

        process.stdout.write('\n');

        for (let i = 0; i < displayCount; i++) {
          const suggestion = suggestions[i];
          const isSelected = i === selectedIndex;

          // Clear this line first
          readline.clearLine(process.stdout, 0);

          if (isSelected) {
            // Highlighted selection with cyan background
            process.stdout.write(chalk.bgCyan.black('❯ ' + suggestion.value));
            if (suggestion.description) {
              process.stdout.write(' ' + chalk.gray(suggestion.description));
            }
          } else {
            process.stdout.write('  ' + chalk.gray(suggestion.value));
            if (suggestion.description) {
              process.stdout.write(' ' + chalk.gray(suggestion.description));
            }
          }

          if (i < displayCount - 1) {
            process.stdout.write('\n');
          }
        }

        // Move cursor back to input line
        readline.moveCursor(process.stdout, 0, -displayCount);
        readline.cursorTo(process.stdout, visiblePromptLength + inputBuffer.length);
      } else {
        lastMenuLines = 0;
      }
    };

    const handleKeypress = (_str: string, key: readline.Key) => {
      if (!key) return;

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
          render();
          return;
        }

        if (key.name === 'down') {
          selectedIndex = selectedIndex < suggestions.length - 1 ? selectedIndex + 1 : 0;
          // Update input buffer to show selected item
          inputBuffer = suggestions[selectedIndex].value;
          render();
          return;
        }
      }

      // Handle Backspace
      if (key.name === 'backspace') {
        if (inputBuffer.length > 0) {
          inputBuffer = inputBuffer.slice(0, -1);
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
        inputBuffer += key.sequence;

        // Check if we should show menu
        const newSuggestions = getSuggestions(inputBuffer);
        suggestions = newSuggestions;
        showMenu = suggestions.length > 0;
        selectedIndex = 0;

        render();
      }
    };

    process.stdin.on('keypress', handleKeypress);

    // Initial render - just show prompt
    readline.cursorTo(process.stdout, 0);
    readline.clearLine(process.stdout, 0);
    process.stdout.write(promptText);
  });
}
