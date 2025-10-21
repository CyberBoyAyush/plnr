import * as readline from 'readline';
import chalk from 'chalk';

/**
 * Sets up ESC key handler for cancelling requests
 * Returns AbortController to pass to API calls
 */
export function setupEscHandler(): { controller: AbortController; cleanup: () => void } {
  const controller = new AbortController();
  let escPressCount = 0;
  let escTimeout: NodeJS.Timeout | null = null;

  // Enable keypress events
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }

  const handleKeypress = (str: string, key: readline.Key) => {
    if (!key) return;

    // Handle ESC key
    if (key.name === 'escape') {
      escPressCount++;

      // Clear previous timeout
      if (escTimeout) {
        clearTimeout(escTimeout);
      }

      if (escPressCount === 1) {
        // First ESC press - show warning
        process.stdout.write('\n' + chalk.yellow('⚠️  Press ESC again to cancel the request\n'));

        // Reset count after 2 seconds
        escTimeout = setTimeout(() => {
          escPressCount = 0;
        }, 2000);
      } else if (escPressCount >= 2) {
        // Second ESC press - cancel (don't show message here, let the catch block handle it)
        // Note: Don't call cleanup() here, let the caller control cleanup timing in finally block
        controller.abort();
      }
    }
  };

  const cleanup = () => {
    if (escTimeout) {
      clearTimeout(escTimeout);
    }
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdin.removeListener('keypress', handleKeypress);
  };

  process.stdin.on('keypress', handleKeypress);

  return { controller, cleanup };
}
