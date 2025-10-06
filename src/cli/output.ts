import chalk from 'chalk';
import { Plan } from '../types/index.js';

export function displayPlan(plan: Plan): void {
  console.log('\n' + chalk.bold.cyan('📋 Implementation Plan') + '\n');
  console.log(chalk.bold('Summary:'));
  console.log(plan.summary + '\n');

  console.log(chalk.bold('Steps:'));
  plan.steps.forEach((step, index) => {
    console.log(chalk.yellow(`\n${index + 1}. ${step.title}`));
    console.log('   ' + step.description);

    if (step.files_to_modify.length > 0) {
      console.log(chalk.gray('   Modify: ' + step.files_to_modify.join(', ')));
    }
    if (step.files_to_create.length > 0) {
      console.log(chalk.gray('   Create: ' + step.files_to_create.join(', ')));
    }
  });

  if (plan.dependencies_to_add.length > 0) {
    console.log('\n' + chalk.bold('Dependencies to Add:'));
    plan.dependencies_to_add.forEach(dep => {
      console.log(chalk.blue('  • ' + dep));
    });
  }

  if (plan.risks.length > 0) {
    console.log('\n' + chalk.bold('⚠️  Risks & Considerations:'));
    plan.risks.forEach(risk => {
      console.log(chalk.yellow('  • ' + risk));
    });
  }

  console.log('');
}

export function displaySuccess(message: string): void {
  console.log(chalk.green('✓ ' + message));
}

export function displayError(message: string): void {
  console.error(chalk.red('✗ ' + message));
}

export function displayInfo(message: string): void {
  console.log(chalk.blue('ℹ ' + message));
}
