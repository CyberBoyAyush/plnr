import chalk from 'chalk';

export const logger = {
  debug: (...args: any[]) => {
    if (process.env.DEBUG === 'true') {
      console.log(chalk.gray('[DEBUG]'), ...args);
    }
  },

  info: (...args: any[]) => {
    console.log(chalk.blue('[INFO]'), ...args);
  },

  success: (...args: any[]) => {
    console.log(chalk.green('✓'), ...args);
  },

  error: (...args: any[]) => {
    console.error(chalk.red('✗'), ...args);
  },

  warn: (...args: any[]) => {
    console.warn(chalk.yellow('[WARN]'), ...args);
  }
};
