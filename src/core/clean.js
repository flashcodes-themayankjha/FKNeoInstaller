
import chalk from 'chalk';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execSync } from 'child_process';
import ora from 'ora';
import cliProgress from 'cli-progress';

// ---------------- Helpers ----------------
function getShellRC() {
  const shell = process.env.SHELL || '';
  if (shell.includes('zsh')) return path.join(os.homedir(), '.zshrc');
  if (shell.includes('bash')) return path.join(os.homedir(), '.bashrc');
  return path.join(os.homedir(), '.profile'); // fallback
}

function removeAlias(aliasName) {
  const rcFile = getShellRC();
  if (!fs.existsSync(rcFile)) return;

  const content = fs.readFileSync(rcFile, 'utf-8');
  const newContent = content
    .split('\n')
    .filter(line => !line.includes(`alias ${aliasName}=`))
    .join('\n');
  fs.writeFileSync(rcFile, newContent);

  try {
    execSync(`${process.env.SHELL} -c "source ${rcFile}"`, { stdio: 'ignore' });
  } catch {}
  console.log(chalk.green(`🔗 Removed alias '${aliasName}' from ${rcFile}`));
}

// ---------------- Clean Command ----------------
export async function runClean() {
  console.clear();
  console.log(chalk.cyanBright('🧹 FkNeo CLI - Clean Prebuilt Setups\n'));

  const prebuilds = ['fkvim', 'lazyvim', 'nvchad', 'lunarvim'];

  const spinner = ora('Starting cleanup...').start();
  await new Promise(r => setTimeout(r, 500));

  for (const pb of prebuilds) {
    const targetDir = path.join(os.homedir(), '.config', pb);
    const backupDir = targetDir + '.bak';

    // Progress bar for folder removal
    const bar = new cliProgress.SingleBar({
      format: chalk.cyan('{bar}') + ' {percentage}% | {stage}',
      barCompleteChar: '█',
      barIncompleteChar: '░',
      hideCursor: true,
    });
    bar.start(100, 0, { stage: `Cleaning ${pb}...` });
    await new Promise(r => setTimeout(r, 200));

    // Remove main folder
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true });
      bar.update(50, { stage: `Removed ${pb}` });
      await new Promise(r => setTimeout(r, 200));
    }

    // Restore backup if exists
    if (fs.existsSync(backupDir)) {
      fs.renameSync(backupDir, targetDir);
      bar.update(90, { stage: `Restored backup for ${pb}` });
      await new Promise(r => setTimeout(r, 200));
    }

    bar.update(100, { stage: `${pb} cleanup complete` });
    bar.stop();

    // Remove alias
    removeAlias(pb);
  }

  spinner.succeed(chalk.green('✅ Cleanup completed for all prebuilt setups.'));
  console.log(chalk.greenBright('\n🎉 All prebuilt configs cleaned, aliases removed, backups restored if available.\n'));
}
