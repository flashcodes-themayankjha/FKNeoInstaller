
import chalk from 'chalk';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execSync } from 'child_process';
import ora from 'ora';
import cliProgress from 'cli-progress';
import { select, confirm } from '@inquirer/prompts';

// ---------------- Helpers ----------------
function getShellRC() {
  const shell = process.env.SHELL || '';
  if (shell.includes('zsh')) return path.join(os.homedir(), '.zshrc');
  if (shell.includes('bash')) return path.join(os.homedir(), '.bashrc');
  return path.join(os.homedir(), '.profile');
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
  console.log(chalk.gray(`🔗 Removed alias '${aliasName}' from ${rcFile}`));
}

function getMeta() {
  const metaPath = path.join(os.homedir(), '.fkneo', 'meta.json');
  if (fs.existsSync(metaPath)) {
    try {
      const data = fs.readFileSync(metaPath, 'utf8').trim();
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [];
    }
  }
  return [];
}

// ---------------- Cleanup ----------------
async function cleanupSingle(entry) {
  const appName = entry.alias || entry.prebuilt.toLowerCase();
  const targetDir = entry.targetDir || path.join(os.homedir(), '.config', appName);
  const backupDir = targetDir + '.bak';

  console.log(chalk.yellow(`\n➡️  Cleaning ${chalk.hex('#b4befe')(appName)} (detected at ${targetDir})`));

  if (process.env.NVIM_APPNAME === appName) {
    const ok = await confirm({
      message: chalk.redBright(`⚠️ '${appName}' is currently active via NVIM_APPNAME. Remove anyway?`),
      default: false,
    });
    if (!ok) {
      console.log(chalk.gray(`⏩ Skipping cleanup for active config '${appName}'.`));
      return { skipped: true };
    }
  }

  const bar = new cliProgress.SingleBar({
    format: chalk.cyan('{bar}') + ` {percentage}% | ${chalk.gray('{stage}')}`,
    barCompleteChar: '█',
    barIncompleteChar: '░',
    hideCursor: true,
  });

  bar.start(100, 0, { stage: 'Starting...' });
  await new Promise(r => setTimeout(r, 150));

  // Delete config folder
  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
    bar.update(50, { stage: 'Removed config directory' });
  } else {
    bar.update(50, { stage: 'Directory not found' });
  }

  // Delete backup if exists
  if (fs.existsSync(backupDir)) {
    fs.rmSync(backupDir, { recursive: true, force: true });
    bar.update(80, { stage: 'Removed backup' });
  }

  // Remove alias
  removeAlias(appName);
  bar.update(100, { stage: 'Done' });
  bar.stop();

  console.log(chalk.greenBright(`✔ Cleaned ${appName}\n`));
  return { skipped: false };
}

// ---------------- Main ----------------
export async function runClean() {
  console.clear();
  console.log(chalk.bgYellow.black.bold('\n [CLEANUP STARTED] ') + chalk.cyanBright(' 🧹 FkNeo CLI - Clean Prebuilt Setups\n'));

  const meta = getMeta();

  if (!meta.length) {
    console.log(chalk.gray('No prebuilt configurations detected in meta.json.\n'));
    return;
  }

  const choices = [
    ...meta.map(entry => ({
      name: `${entry.prebuilt || entry.alias} (${entry.alias || entry.prebuilt})`,
      value: entry,
    })),
    { name: '🧹 Remove ALL', value: 'all' },
  ];

  const selected = await select({
    message: chalk.yellow('Select a prebuild to clean:'),
    choices,
  });

  const spinner = ora('Preparing cleanup...').start();
  await new Promise(r => setTimeout(r, 300));
  spinner.stop();

  const targets = selected === 'all' ? meta : [selected];
  for (const entry of targets) {
    await cleanupSingle(entry);
  }

  // Update meta.json
  const newMeta = selected === 'all'
    ? []
    : meta.filter(m => !targets.some(t => t.alias === m.alias));

  const metaPath = path.join(os.homedir(), '.fkneo', 'meta.json');
  fs.writeFileSync(metaPath, JSON.stringify(newMeta, null, 2), 'utf8');

  console.log(chalk.greenBright('\n🎉 Clean operation finished.\n'));
}

// Run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    await runClean();
  })();
}
