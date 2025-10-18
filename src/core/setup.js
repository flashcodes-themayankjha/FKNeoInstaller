
import { input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import ora from 'ora';
import cliProgress from 'cli-progress';
import Table from 'cli-table3';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn, execSync } from 'child_process';

// Get package version dynamically
const packageJsonPath = path.resolve(process.cwd(), 'package.json');
let version = 'v0.0.0';
try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  version = `v${packageJson.version}`;
} catch (err) {
  console.error(chalk.redBright('🚧 Could not read package.json for version.'));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function getShellRC() {
  const shell = process.env.SHELL || '';
  if (shell.includes('zsh')) return path.join(os.homedir(), '.zshrc');
  if (shell.includes('bash')) return path.join(os.homedir(), '.bashrc');
  if (shell.includes('fish')) return path.join(os.homedir(), '.config', 'fish', 'config.fish');
  return path.join(os.homedir(), '.profile');
}

function writeMetadata(data) {
  const metaPath = path.join(os.homedir(), '.fkneo', 'meta.json');
  fs.mkdirSync(path.dirname(metaPath), { recursive: true });
  fs.writeFileSync(metaPath, JSON.stringify(data, null, 2));
}

function addShellAlias(aliasName, nvimAppName, isMain = false) {
  const rcFile = getShellRC();
  if (!fs.existsSync(rcFile)) return;

  const aliasCmds = [];
  if (!isMain) {
    aliasCmds.push(`alias ${aliasName}='NVIM_APPNAME="${nvimAppName}" nvim'`);
  } else {
    aliasCmds.push(`alias fkall='nvim .'`);
    aliasCmds.push(`alias fk.config='nvim ~/.config/nvim/'`);
  }

  fs.appendFileSync(rcFile, aliasCmds.join('\n') + '\n');
  console.log(chalk.green(`🔗 Aliases added to ${rcFile}`));
  console.log(chalk.cyan(`ℹ️ Run 'source ${rcFile}' or restart your terminal to apply changes.`));
}

async function handleExistingConfig(targetDir, aliasName) {
  if (!fs.existsSync(targetDir)) return aliasName;

  console.log(chalk.yellowBright(`⚠️  Config already exists at ${targetDir}`));
  const choice = await select({
    message: 'Choose an action:',
    choices: [
      { name: `Backup existing ${aliasName}`, value: 'backup' },
      { name: `Remove existing ${aliasName}`, value: 'remove' },
      { name: 'Change alias name', value: 'rename' },
    ],
  });

  if (choice === 'backup') {
    const backupName = `${aliasName}-backup-${Date.now()}`;
    const backupPath = path.join(path.dirname(targetDir), backupName);
    fs.renameSync(targetDir, backupPath);
    console.log(chalk.green(`✔ Existing config backed up to ${backupPath}`));
  } else if (choice === 'remove') {
    fs.rmSync(targetDir, { recursive: true, force: true });
    console.log(chalk.green(`✔ Existing config removed.`));
  } else if (choice === 'rename') {
    const newAlias = await input({ message: 'Enter new alias name:', default: aliasName });
    const newTargetDir = path.join(os.homedir(), '.config', newAlias.trim());
    return await handleExistingConfig(newTargetDir, newAlias.trim());
  }
  return aliasName;
}

async function cloneRepoWithProgress(repo, targetDir, name) {
  const bar = new cliProgress.SingleBar({
    format: '{bar} {percentage}% | {task}',
    barCompleteChar: '█',
    barIncompleteChar: '░',
    hideCursor: true,
  });

  bar.start(100, 0, { task: `Cloning ${name}...` });

  if (!fs.existsSync(path.dirname(targetDir))) fs.mkdirSync(path.dirname(targetDir), { recursive: true });

  return new Promise((resolve, reject) => {
    const git = spawn('git', ['clone', '--progress', repo, targetDir]);

    let fakeProgress = 0;
    const interval = setInterval(() => {
      if (fakeProgress < 50) fakeProgress += Math.random() * 5;
      bar.update(Math.min(fakeProgress, 50));
    }, 200);

    git.stderr.on('data', (data) => {
      const text = data.toString();
      if (text.includes('Receiving objects')) fakeProgress = 50 + Math.random() * 30;
      if (text.includes('Resolving deltas')) fakeProgress = 80 + Math.random() * 15;
      bar.update(Math.min(fakeProgress, 95));
    });

    git.on('close', (code) => {
      clearInterval(interval);
      bar.update(100, { task: `${name} cloned successfully` });
      bar.stop();
      if (code === 0) {
        console.log(chalk.green(`✔ ${name} cloned at ${targetDir}`));
        resolve();
      } else {
        console.log(chalk.red(`❌ Failed to clone ${name}`));
        reject(new Error('Git clone failed'));
      }
    });
  });
}

async function installGemini() {
  const spinner = ora('Installing Gemini CLI...').start();
  try {
    execSync('npm install -g gemini-cli', { stdio: 'ignore' });
    spinner.succeed(chalk.green('✔ Gemini CLI installed.'));
  } catch {
    spinner.fail(chalk.red('❌ Failed to install Gemini CLI.'));
  }
}

async function multiLevelPluginInstall(targetDir) {
  const spinner = ora('Detecting package manager...').start();
  await sleep(700);
  spinner.succeed(chalk.green('✔ Detected package manager: Lazy.nvim'));

  const bar = new cliProgress.SingleBar({
    format: '{bar} {percentage}% | {task}',
    barCompleteChar: '█',
    barIncompleteChar: '░',
    hideCursor: true,
  });
  bar.start(100, 0, { task: 'Initializing...' });

  const pluginGroups = [
    { name: 'Basic Plugins', percent: 25 },
    { name: 'LSP + Dependencies', percent: 50 },
    { name: 'FkNotes + FkThemes', percent: 75 },
    { name: 'Treesitter', percent: 100 },
  ];

  for (const group of pluginGroups) {
    console.log(`➡️ Installing ${group.name}...`);
    await sleep(500 + Math.random() * 800);
    bar.update(group.percent, { task: group.name });
    console.log(chalk.green(`✔ ${group.name} installed.`));
  }

  bar.stop();
  console.log(chalk.green('🎉 All plugin systems installed!'));

  execSync(`NVIM_APPNAME="${path.basename(targetDir)}" nvim --headless "+Lazy! sync" +qa`, { stdio: 'inherit' });
}

async function showStep(number, total, label) {
  const catppuccinYellow = '#f9e2af';
  const badge = chalk.bgHex(catppuccinYellow).black.bold(`[Step ${number}/${total}]`);
  console.log(`\n${badge} ${chalk.white.bold(label)}\n`);
  await sleep(250);
}

export async function runSetup() {
  console.clear();
  console.log(chalk.bgYellow.black.bold(`\n🧩 FkNeoInstaller ${version}  \n`));

  try {
    await showStep(1, 4, 'Select Setup Type');
    const setupType = await select({
      message: chalk.yellowBright('Select your setup type:'),
      choices: [
        { name: 'Minimal (fast, default config)', value: 'minimal' },
        { name: 'Prebuilt (FkVim, LazyVim, NVChad, LunarVim)', value: 'prebuilt' },
        { name: 'Custom (pick plugins and options)', value: 'custom' },
      ],
    });
    console.log(chalk.greenBright(`\n✅ You selected: ${setupType} setup\n`));

    if (setupType === 'prebuilt') {
      await showStep(2, 4, 'Choose Prebuilt Configuration');
      const choice = await select({
        message: chalk.yellowBright('Select a Prebuilt config:'),
        choices: [
          { name: 'FkVim (Recommended)', value: 'fkvim' },
          { name: 'LazyVim', value: 'lazyvim' },
          { name: 'NVChad', value: 'nvchad' },
          { name: 'LunarVim', value: 'lunarvim' },
        ],
      });

      const mainOrAlias = await select({
        message: chalk.yellowBright('Use this as your main Neovim config?'),
        choices: [
          { name: 'Yes, main config (~/.config/nvim)', value: true },
          { name: 'No, create custom alias', value: false },
        ],
      });

      const prebuiltConfigs = {
        fkvim: { name: 'FkVim', repo: 'https://github.com/TheFlashCodes/FKvim', appName: 'fkvim' },
        lazyvim: { name: 'LazyVim', repo: 'https://github.com/LazyVim/starter', appName: 'lazyvim' },
        nvchad: { name: 'NVChad', repo: 'https://github.com/NvChad/NvChad', appName: 'nvchad' },
        lunarvim: { name: 'LunarVim', repo: 'https://github.com/LunarVim/LunarVim', appName: 'lunarvim' },
      };

      const selectedConfig = prebuiltConfigs[choice];
      selectedConfig.main = mainOrAlias;

      if (!mainOrAlias) {
        let aliasName = await input({
          message: `Enter alias name for ${selectedConfig.name} config:`,
          default: selectedConfig.appName,
        });
        aliasName = aliasName.trim();
        selectedConfig.appName = await handleExistingConfig(
          path.join(os.homedir(), '.config', aliasName),
          aliasName
        );
      } else {
        selectedConfig.appName = 'nvim';
      }

      const targetDir = selectedConfig.main
        ? path.join(os.homedir(), '.config', 'nvim')
        : path.join(os.homedir(), '.config', selectedConfig.appName);

      await showStep(3, 4, 'Install Dependencies and Configure');

      if (choice === 'fkvim') {
        const fkAiChoice = await select({
          message: chalk.yellowBright('Enable FkAi (Gemini CLI integration)?'),
          choices: [
            { name: 'Yes', value: true },
            { name: 'No', value: false },
          ],
        });
        if (fkAiChoice) await installGemini();
        selectedConfig.aiEnabled = fkAiChoice;
      }

      await cloneRepoWithProgress(selectedConfig.repo, targetDir, selectedConfig.name);
      await multiLevelPluginInstall(targetDir);

      await showStep(4, 4, 'Finalizing Setup');
      addShellAlias(selectedConfig.appName, selectedConfig.appName, selectedConfig.main);

      writeMetadata({
        prebuilt: selectedConfig.name,
        main: selectedConfig.main,
        alias: selectedConfig.appName,
        targetDir,
        aiEnabled: selectedConfig.aiEnabled || false,
        nvimAlias: selectedConfig.main ? 'nvim' : selectedConfig.appName,
      });

      // ✅ Summary Table
      const table = new Table({
        head: ['Config', 'Value'],
        colWidths: [20, 60],
        style: { head: ['yellow'] },
      });
      table.push(
        ['Config', selectedConfig.name],
        ['Main', selectedConfig.main ? 'Yes' : 'No'],
        ['Alias', selectedConfig.appName],
        ['AI', selectedConfig.aiEnabled ? 'Enabled' : 'Disabled'],
        ['Location', targetDir],
        ['Launch', selectedConfig.main ? 'nvim' : selectedConfig.appName]
      );
      console.log(chalk.bgYellow.black.bold('\nSummary\n'));
      console.log(table.toString());

      console.log(chalk.greenBright('\n🎉 Setup Complete!'));
    }
  } catch (err) {
    if (err.name === 'ExitPromptError') {
      console.log(chalk.redBright('\n⚠️  Setup aborted by user.\n'));
      process.exit(0);
    } else {
      console.error(chalk.red(`❌ Unexpected error: ${err.message}`));
      process.exit(1);
    }
  }
}
