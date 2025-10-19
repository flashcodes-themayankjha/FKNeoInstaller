
import readline from 'readline';
import { handleCommand } from './commands.js';
import chalk from 'chalk';

export async function startRepl() {
  console.log(`
Welcome to FkNeo CLI! Type ${chalk.green('help')} ❓ for options. 
`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${chalk.yellow('FkNeo')} ${chalk.green('»')} `,
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const cmd = line.trim().toLowerCase();

    // Handle the command
    try {
      const shouldExit = await handleCommand(cmd);

      if (shouldExit) {
        console.log(chalk.greenBright('\n👋 Goodbye!\n'));
        rl.close(); // close input stream gracefully
      } else {
        rl.prompt(); // show prompt again
      }
    } catch (err) {
      console.error(chalk.red(`\n⚠️ Error: ${err.message}`));
      rl.prompt();
    }
  });

  rl.on('close', () => {
    console.log(chalk.gray('\nSession ended. You can restart with `fkneo` anytime.\n'));
    // ❌ Removed process.exit(0)
    // ✅ Just return naturally
  });
}
