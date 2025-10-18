import chalk from 'chalk';

export async function handleCommand(cmd) {
  switch (cmd) {
    case 'help':
      console.log(`
${chalk.green('Available Commands:')}
  help    Show this help message
  setup   Start Neovim configuration setup
  quit    Exit the CLI
`);
      return false;

    case 'setup':
      console.log(chalk.cyan('\n🧩 Setup mode coming soon...\n'));
      return false;

    case 'quit':
    case 'exit':
      return true;

    default:
      console.log(chalk.red('Unknown command. Type "help" to see options.'));
      return false;
  }
}

