import fs from 'fs';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { getShellRC } from './system.js';

export function addShellAlias(aliasName, nvimAppName, isMain = false) {
  const rcFile = getShellRC();
  if (!fs.existsSync(rcFile)) {
    console.log(chalk.yellow(`⚠️ Shell rc not found at ${rcFile}, skipping alias write.`));
    return;
  }

  const aliasLines = [];
  if (!isMain) {
    aliasLines.push(`# FkNeoInstaller alias for ${aliasName}`);
    aliasLines.push(`alias ${aliasName}='NVIM_APPNAME="${nvimAppName}" nvim'`);
  } else {
    aliasLines.push('# FkNeoInstaller shortcuts for main config');
    aliasLines.push(`alias fkall='nvim .'`);
    aliasLines.push(`alias fk.config='nvim ~/.config/nvim/'`);
  }

  fs.appendFileSync(rcFile, '\n' + aliasLines.join('\n') + '\n', 'utf8');

  // Best-effort reload (use user's login shell)
  try {
    execSync(`${process.env.SHELL} -lc "source ${rcFile}"`, { stdio: 'ignore' });
    console.log(chalk.green(`🔗 Aliases added and shell reloaded (${rcFile})`));
  } catch {
    console.log(chalk.green(`🔗 Aliases added to ${rcFile}`));
    console.log(chalk.cyan(`ℹ️ Run 'source ${rcFile}' or restart your terminal to apply changes.`));
  }
}