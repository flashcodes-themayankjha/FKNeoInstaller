import readline from 'readline';
import { authenticateUser } from './auth.js';
import { handleCommand } from './commands.js';

export async function startRepl() {
  console.log("\nWelcome to FkNeo CLI! Type 'help' for options.\n");

  await authenticateUser();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'fkneo> ',
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

