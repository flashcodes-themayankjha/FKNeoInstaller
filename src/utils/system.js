
import fs from 'fs';
import os from 'os';
import path from 'path';
import chalk from 'chalk';
import { execSync } from 'child_process';

export function getShellRC() {
  const shell = process.env.SHELL || '';
  if (shell.includes('zsh')) return path.join(os.homedir(), '.zshrc');
  if (shell.includes('bash')) return path.join(os.homedir(), '.bashrc');
  if (shell.includes('fish')) return path.join(os.homedir(), '.config', 'fish', 'config.fish');
  return path.join(os.homedir(), '.profile');
}

export function ensureLocalBinInPath() {
  const localBin = path.join(os.homedir(), '.local', 'bin');
  const currentPath = process.env.PATH || '';
  const rcFile = getShellRC();

  // If already present, skip
  if (currentPath.split(path.delimiter).includes(localBin)) {
    console.log(chalk.green('✔ ~/.local/bin is already in PATH.'));
    return;
  }

  // Append export command
  const exportLine = `\n# Added by FkNeoInstaller\nexport PATH="$HOME/.local/bin:$PATH"\n`;
  try {
    fs.appendFileSync(rcFile, exportLine, 'utf8');
    console.log(chalk.yellow(`⚠️  Added ~/.local/bin to PATH in ${rcFile}`));

    // Try to reload shell config
    try {
      execSync(`${process.env.SHELL} -lc \"source ${rcFile}\"`, { stdio: 'ignore' });
      console.log(chalk.green('✔ Shell reloaded successfully (PATH updated).'));
    } catch {
      console.log(chalk.cyan('ℹ️ Restart your terminal or run `source ~/.zshrc` to apply changes.'));
    }
  } catch (err) {
    console.log(chalk.red(`❌ Failed to modify ${rcFile}: ${err.message}`));
  }
}
