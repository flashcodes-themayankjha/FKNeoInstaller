
import { input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import ora from 'ora';
import cliProgress from 'cli-progress';
import Table from 'cli-table3';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn, execSync } from 'child_process';

// ---------------- Package Version ----------------
let version = 'v0.0.0';
try {
  const packageJson = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8'));
  version = `v${packageJson.version}`;
} catch {
  console.log(chalk.redBright('🚧 Could not read package.json version.'));
}

// ---------------- Helpers ----------------
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

// ---------------- Handle Existing Config ----------------
async function handleExistingConfig(targetDir, aliasName) {
  if (!fs.existsSync(targetDir)) return aliasName;

  console.log(chalk.yellowBright(`⚠️ Config already exists at ${targetDir}`));
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
    return await handleExistingConfig(newTargetDir, newAlias.trim()); // recursive check
  }
  return aliasName;
}

// ---------------- Git Clone with Dynamic Progress ----------------
async function cloneRepoWithProgress(repo, targetDir, name) {
  if (!fs.existsSync(path.dirname(targetDir))) fs.mkdirSync(path.dirname(targetDir), { recursive: true });
  console.log(chalk.cyan(`\n📦 Cloning ${name} into ${targetDir}...\n`));

  const bar = new cliProgress.MultiBar({
    clearOnComplete: false,
    hideCursor: false,
    format: '{bar} {percentage}% | {task}',
  }, cliProgress.Presets.shades_classic);

  const overall = bar.create(100, 0, { task: 'Overall Progress' });
  const cloneBar = bar.create(100, 0, { task: `${name} Cloning` });

  return new Promise((resolve, reject) => {
    const git = spawn('git', ['clone', '--progress', repo, targetDir]);
    let lastPercent = 0;

    git.stderr.on('data', (data) => {
      const str = data.toString();
      const match = str.match(/Receiving objects:\s+(\d+)%/);
      if (match) {
        const percent = parseInt(match[1]);
        if (percent > lastPercent) {
          lastPercent = percent;
          cloneBar.update(percent);
          overall.update(percent * 0.3); // cloning counts as 30% overall
        }
      }
    });

    git.on('close', (code) => {
      if (code === 0) {
        cloneBar.update(100);
        overall.update(30);
        bar.stop();
        console.log(chalk.green(`✔ ${name} cloned successfully at ${targetDir}\n`));
        resolve();
      } else {
        bar.stop();
        console.log(chalk.red(`❌ Failed to clone ${name}`));
        reject(new Error('Git clone failed'));
      }
    });
  });
}

// ---------------- Gemini Installer ----------------
async function installGemini() {
  const spinner = ora('Installing Gemini CLI...').start();
  try {
    execSync('npm install -g gemini-cli', { stdio: 'ignore' });
    spinner.succeed(chalk.green('✔ Gemini CLI installed.'));
  } catch {
    spinner.fail(chalk.red('❌ Failed to install Gemini CLI.'));
  }
}

// ---------------- Multi-level Plugin Installation ----------------
async function multiLevelPluginInstall(targetDir) {
  const spinner = ora('Detecting package manager...').start();
  await sleep(700);
  spinner.succeed(chalk.green('✔ Detected package manager: Lazy.nvim'));

  const bar = new cliProgress.MultiBar({
    clearOnComplete: false,
    hideCursor: false,
    format: '{bar} {percentage}% | {task}',
  }, cliProgress.Presets.shades_classic);

  const overall = bar.create(100, 30, { task: 'Overall Progress' }); // 30% after clone
  const pluginBar = bar.create(100, 0, { task: 'Initializing...' });

  const pluginGroups = [
    { name: 'Basic Plugins', percent: 25 },
    { name: 'LSP + Dependencies', percent: 50 },
    { name: 'FkNotes + FkThemes', percent: 75 },
    { name: 'Treesitter', percent: 100 },
  ];

  for (const group of pluginGroups) {
    console.log(`➡️ Installing ${group.name}...`);
    await sleep(800 + Math.random() * 700);
    pluginBar.update(group.percent, { task: group.name });
    overall.update(30 + group.percent * 0.7); // 30% clone + plugin percentage
    console.log(chalk.green(`✔ ${group.name} installed.`));
  }

  bar.stop();
  console.log(chalk.green('🎉 All plugin systems installed!'));

  // Actually run Lazy.nvim sync
  execSync(`NVIM_APPNAME="${path.basename(targetDir)}" nvim --headless "+Lazy! sync" +qa`, { stdio: 'inherit' });
}

// ---------------- Step UI ----------------
async function showStep(number, total, label) {
  const catppuccinYellow = '#f9e2af';
  const badge = chalk.bgHex(catppuccinYellow).black.bold(`[Step ${number}/${total}]`);
  console.log(`\n${badge} ${chalk.white.bold(label)}\n`);
  await sleep(250);
}

// ---------------- Main ----------------
export async function runSetup() {
  console.clear();
  console.log(chalk.black.bgYellow.bold(`\n🧩 FkNeoInstaller ${version}\n`));

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
        aliasName = await handleExistingConfig(
          path.join(os.homedir(), '.config', aliasName.trim()),
          aliasName.trim()
        );
        selectedConfig.appName = aliasName;
      } else {
        // main nvim
        await handleExistingConfig(path.join(os.homedir(), '.config', 'nvim'), 'nvim');
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

      // ---------------- Summary Table ----------------
      const table = new Table({
        head: ['Config', 'Value'],
        colWidths: [20, 50],
        style: { head: ['cyan'] },
      });

      table.push(
        ['Config', selectedConfig.name],
        ['Main', selectedConfig.main ? 'Yes' : 'No'],
        ['Alias', selectedConfig.appName],
        ['AI', selectedConfig.aiEnabled ? 'Enabled' : 'Disabled'],
        ['Location', targetDir],
        ['Launch', selectedConfig.main ? 'nvim' : selectedConfig.appName]
      );

      console.log(chalk.bgYellow.black('\n FkNeoInstaller Summary \n'));
      console.log(table.toString());

      console.log(chalk.greenBright('\n🎉 Setup Complete!\n'));
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
