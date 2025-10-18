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
    const exit = await handleCommand(cmd);
    if (exit) rl.close();
    else rl.prompt();
  });

  rl.on('close', () => {
    console.log('\n👋 Goodbye, and happy hacking in Neovim!');
    process.exit(0);
  });
}

