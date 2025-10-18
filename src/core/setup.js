
import { input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import ora from 'ora';
import cliProgress from 'cli-progress';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execSync } from 'child_process';

// ------------------------ Helpers ------------------------
function getShellRC() {
  const shell = process.env.SHELL || '';
  if (shell.includes('zsh')) return path.join(os.homedir(), '.zshrc');
  if (shell.includes('bash')) return path.join(os.homedir(), '.bashrc');
  return path.join(os.homedir(), '.profile');
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

  try {
    // Auto-reload shell
    execSync(`${process.env.SHELL} -c "source ${rcFile}"`, { stdio: 'ignore' });
  } catch {}
  console.log(chalk.green(`🔗 Aliases added and shell reloaded (${rcFile})`));
}

async function cloneRepoWithProgress(repo, targetDir, name) {
  // Backup existing folder if exists
  if (fs.existsSync(targetDir)) {
    const backupDir = targetDir + '.bak';
    console.log(chalk.yellow(`⚠️ Existing folder detected at ${targetDir}. Backing up to ${backupDir}`));
    try {
      fs.renameSync(targetDir, backupDir);
    } catch (err) {
      // If not empty, remove recursively
      fs.rmSync(backupDir, { recursive: true, force: true });
      fs.renameSync(targetDir, backupDir);
    }
  }

  fs.mkdirSync(targetDir, { recursive: true });

  const progressBar = new cliProgress.SingleBar({
    format: chalk.cyan('{bar}') + ' {percentage}% | {stage}',
    barCompleteChar: '█',
    barIncompleteChar: '░',
    hideCursor: true,
  });

  console.log(chalk.blueBright(`\n🔧 Installing ${name}...\n`));
  progressBar.start(100, 0, { stage: 'Starting...' });

  try {
    execSync(`git clone ${repo} "${targetDir}"`, { stdio: 'ignore' });

    for (let i = 0; i <= 100; i += 10) {
      progressBar.update(i, { stage: `Cloning ${name}...` });
      await new Promise(r => setTimeout(r, 100));
    }

    progressBar.update(100, { stage: `${name} cloned!` });
    progressBar.stop();
    console.log(chalk.green(`✔ ${name} cloned successfully at ${targetDir}`));
  } catch (err) {
    progressBar.stop();
    console.log(chalk.red(`❌ Failed to clone ${name}: ${err.message}`));
    throw err;
  }
}

// ------------------------ Main Setup ------------------------
export async function runSetup() {
  console.clear();
  console.log(chalk.cyanBright('🧩 FkNeo CLI Setup\n'));

  const section = (title) => chalk.bgYellow.black.bold(` ${title.toUpperCase()} `);

  // 1️⃣ Setup type
  console.log(section('SETUP TYPE'));
  let setupType;
  try {
    setupType = await select({
      message: chalk.yellowBright('Select your setup type:'),
      choices: [
        { name: 'Minimal (fast, default config)', value: 'minimal' },
        { name: 'Prebuilt (FkVim, LazyVim, NVChad, LunarVim)', value: 'prebuilt' },
        { name: 'Custom (pick plugins and options)', value: 'custom' },
      ],
    });
  } catch (err) {
    if (err.name === 'ExitPromptError') {
      console.log(chalk.redBright('\n⚠️ Setup aborted by user.\n'));
      return;
    }
    throw err;
  }

  console.log(chalk.greenBright(`\n✅ You selected: ${setupType} setup\n`));

  // ---------------- Prebuilt Flow ----------------
  if (setupType === 'prebuilt') {
    console.log(section('SELECT PREBUILT CONFIG'));

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
      message: chalk.yellowBright('Do you want to use this as your main Neovim config?'),
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
      const aliasName = await input({
        message: `Enter alias name for ${selectedConfig.name} config:`,
        default: selectedConfig.appName,
      });
      selectedConfig.appName = aliasName.trim();
    }

    // FkVim + FkAi check
    if (choice === 'fkvim') {
      const fkAiChoice = await select({
        message: chalk.yellowBright('Do you want to use FkAi with FkVim?'),
        choices: [
          { name: 'Yes', value: true },
          { name: 'No', value: false },
        ],
      });

      if (fkAiChoice) {
        try {
          execSync('gemini --version', { stdio: 'ignore' });
          console.log(chalk.green('✅ Gemini CLI detected.'));
        } catch {
          console.log(chalk.blue('⚡ Installing Gemini CLI...'));
          const spinner = ora('Installing Gemini CLI...').start();
          execSync('npm install -g gemini-cli', { stdio: 'ignore' });
          spinner.succeed(chalk.green('✅ Gemini CLI installed.'));
        }
      }
    }

    // Determine target directory
    const targetDir = selectedConfig.main
      ? path.join(os.homedir(), '.config', 'nvim')
      : path.join(os.homedir(), '.config', selectedConfig.appName);

    // Clone with progress
    await cloneRepoWithProgress(selectedConfig.repo, targetDir, selectedConfig.name);

    // Add aliases
    addShellAlias(selectedConfig.appName, selectedConfig.appName, selectedConfig.main);

    console.log(chalk.greenBright(`\n🎉 Setup complete! Use 'nvim'${!selectedConfig.main ? ` or '${selectedConfig.appName}'` : ''} to launch.`));
    return;
  }

  // ---------------- Minimal / Custom Flow ----------------
  if (setupType === 'minimal' || setupType === 'custom') {
    console.log(chalk.blueBright('🧩 Minimal/Custom setup not implemented yet.\n'));
    return;
  }
}
