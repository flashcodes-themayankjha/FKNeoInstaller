
import chalk from 'chalk';
import ora from 'ora';
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ensureLocalBinInPath, getShellRC } from '../utils/system.js';
import { writeMetadata } from '../utils/meta.js';

export async function installLunarVim(aiEnabled) {
  console.log(chalk.cyan('\n➡️ Installing LunarVim using official bootstrap script...\n'));
  const spinner = ora('Running LunarVim installer...').start();

  try {
    // Run official LunarVim installer
    const installer = spawn(
      'bash',
      [
        '-c',
        'curl -s https://raw.githubusercontent.com/LunarVim/LunarVim/master/utils/installer/install.sh | bash'
      ],
      { stdio: 'inherit' }
    );

    // Wait for installer to finish
    await new Promise((resolve, reject) => {
      installer.on('close', (code) => {
        if (code === 0) {
          spinner.succeed(chalk.green('✔ LunarVim installed successfully.'));
          resolve();
        } else {
          spinner.fail(chalk.red('❌ LunarVim installation failed.'));
          console.log(
            chalk.cyan(
              'You can install manually using:\n  bash <(curl -s https://raw.githubusercontent.com/LunarVim/LunarVim/master/utils/installer/install.sh)'
            )
          );
          reject(new Error('Installer failed.'));
        }
      });
    });

    // 🧩 Ensure ~/.local/bin is in PATH
    ensureLocalBinInPath();

    // 🪪 Add alias `lvim` if binary exists
    const localBin = path.join(os.homedir(), '.local', 'bin');
    const lvimBinary = path.join(localBin, 'lvim');
    const rcFile = getShellRC();

    if (fs.existsSync(lvimBinary)) {
      const aliasLine = `alias lvim="$HOME/.local/bin/lvim"`;
      const rcContent = fs.existsSync(rcFile) ? fs.readFileSync(rcFile, 'utf8') : '';
      if (!rcContent.includes(aliasLine)) {
        fs.appendFileSync(rcFile, `\n# Added by FkNeoInstaller\n${aliasLine}\n`, 'utf8');
        console.log(chalk.yellow(`⚙️  Added alias 'lvim' in ${rcFile}`));
      }
    }

    // 🧭 Verify binary availability
    try {
      execSync('command -v lvim', { stdio: 'ignore' });
      console.log(chalk.green('✔ lvim command available.'));
    } catch {
      console.log(chalk.yellow('⚠️ lvim command not found yet — restart your terminal.'));
    }

    // 🪶 Save metadata
    writeMetadata({
      prebuilt: 'LunarVim',
      main: false,
      alias: 'lvim',
      targetDir: path.join(os.homedir(), '.config', 'lvim'),
      aiEnabled,
      method: 'installer',
      installedAt: new Date().toISOString(),
    });

  } catch (err) {
    spinner.fail(chalk.red('❌ LunarVim installation failed.'));
    console.log(
      chalk.cyan(
        '\nYou can install manually using:\n  bash <(curl -s https://raw.githubusercontent.com/LunarVim/LunarVim/master/utils/installer/install.sh)\n'
      )
    );
  }
}
