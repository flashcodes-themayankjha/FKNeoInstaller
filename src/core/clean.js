
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
  console.log(chalk.green(`🔗 Removed alias '${aliasName}' from ${rcFile}`));
}

function getMeta() {
  const metaPath = path.join(os.homedir(), '.fkneo', 'meta.json');
  if (fs.existsSync(metaPath)) {
    try {
      return JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    } catch {
      return {};
    }
  }
  return {};
}

function detectInstalledPrebuilds() {
  const baseConfigs = ['fkvim', 'lazyvim', 'nvchad', 'lunarvim', 'nvim'];
  const installed = [];

  for (const name of baseConfigs) {
    const dir = path.join(os.homedir(), '.config', name);
    if (fs.existsSync(dir)) installed.push(name);
  }

  return [...new Set(installed)];
}

// ---------------- Cleanup ----------------
async function cleanupSingle(appName, meta) {
  const targetDir = path.join(os.homedir(), '.config', appName);
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
    format: chalk.cyan('{bar}') + ' {percentage}% | {stage}',
    barCompleteChar: '█',
    barIncompleteChar: '░',
    hideCursor: true,
  });

  bar.start(100, 0, { stage: 'Starting...' });
  await new Promise(r => setTimeout(r, 200));

  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
    bar.update(50, { stage: 'Removed config' });
  }

  if (fs.existsSync(backupDir)) {
    fs.renameSync(backupDir, targetDir);
    bar.update(90, { stage: 'Restored backup' });
  }

  bar.update(100, { stage: 'Done' });
  bar.stop();

  removeAlias(appName);

  const metaPath = path.join(os.homedir(), '.fkneo', 'meta.json');
  if (fs.existsSync(metaPath)) {
    try {
      const metaData = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      if (metaData.prebuilt?.toLowerCase() === appName.toLowerCase()) {
        fs.rmSync(metaPath, { force: true });
      } else if (metaData[appName]) {
        delete metaData[appName];
        fs.writeFileSync(metaPath, JSON.stringify(metaData, null, 2), 'utf8');
      }
    } catch {}
  }

  console.log(chalk.greenBright(`✔ Cleaned ${appName}\n`));
  return { skipped: false };
}

// ---------------- Main ----------------
export async function runClean() {
  console.clear();
  console.log(chalk.bgYellow.black.bold('\n [CLEANUP STARTED] ') + chalk.cyanBright(' 🧹 FkNeo CLI - Clean Prebuilt Setups\n'));

  const installed = detectInstalledPrebuilds();
  if (!installed.length) {
    console.log(chalk.gray('No prebuilt configurations detected on this system.\n'));
    return;
  }

  const options = [...installed.map(p => ({ name: p, value: p })), { name: '🧹 Remove ALL', value: 'all' }];
  const selected = await select({
    message: chalk.yellow('Select a prebuild to clean:'),
    choices: options,
  });

  const meta = getMeta();
  const targets = selected === 'all' ? installed : [selected];

  const spinner = ora('Starting cleanup...').start();
  await new Promise(r => setTimeout(r, 300));
  spinner.stop();

  for (const appName of targets) {
    await cleanupSingle(appName, meta);
  }

  console.log(chalk.greenBright('\n🎉 Clean operation finished.\n'));
}

// Run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    await runClean();
  })();
}
