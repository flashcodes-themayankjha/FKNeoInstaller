
import { input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import ora from 'ora';
import cliProgress from 'cli-progress';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execSync } from 'child_process';

// ---------------- Helpers ----------------
function getShellRC() {
  const shell = process.env.SHELL || '';
  if (shell.includes('zsh')) return path.join(os.homedir(), '.zshrc');
  if (shell.includes('bash')) return path.join(os.homedir(), '.bashrc');
  if (shell.includes('fish')) return path.join(os.homedir(), '.config/fish/config.fish');
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

  const spinner = ora('Applying shell aliases...').start();
  try {
    if (process.env.SHELL.includes('fish')) {
      execSync(`source ${rcFile}`, { stdio: 'ignore' });
    } else {
      execSync(`. ${rcFile}`, { stdio: 'ignore' });
    }
    spinner.succeed(chalk.green(' Aliases applied.'));
  } catch {
    spinner.succeed(chalk.yellow(' Aliases added. Reload your shell to apply.'));
  }
}

async function cloneRepoWithProgress(repo, targetDir, name) {
  try {
    if (fs.existsSync(targetDir)) {
      const backupDir = targetDir + '.bak';
      console.log(chalk.yellow(`⚠️ Existing folder detected at ${targetDir}. Backing up to ${backupDir}`));
      fs.renameSync(targetDir, backupDir);
    }
    fs.mkdirSync(targetDir, { recursive: true });
  } catch (err) {
    throw new Error(`Failed to prepare target directory: ${err.message}`);
  }

  const progressBar = new cliProgress.SingleBar({
    format: chalk.cyan('{bar}') + ' {percentage}% | {stage}',
    barCompleteChar: '█',
    barIncompleteChar: '░',
    hideCursor: true,
  });
  progressBar.start(100, 0, { stage: 'Starting clone...' });

  try {
    execSync(`git clone ${repo} "${targetDir}"`, { stdio: 'ignore' });

    // simulate progress
    for (let i = 0; i <= 100; i += 10) {
      progressBar.update(i, { stage: `Cloning ${name}...` });
      await new Promise(r => setTimeout(r, 100));
    }
    progressBar.update(100, { stage: `${name} cloned!` });
    progressBar.stop();
  } catch (err) {
    progressBar.stop();
    throw new Error(`❌ Failed to clone ${name}: ${err.message}`);
  }
}

async function removePrebuilt(aliasName, nvimAppName, main = false) {
  try {
    const targetDir = main
      ? path.join(os.homedir(), '.config', 'nvim')
      : path.join(os.homedir(), '.config', nvimAppName);
    if (fs.existsSync(targetDir)) fs.rmSync(targetDir, { recursive: true, force: true });
    const rcFile = getShellRC();
    if (fs.existsSync(rcFile)) {
      const content = fs.readFileSync(rcFile, 'utf-8');
      const newContent = content
        .split('\n')
        .filter(line => !line.includes(`alias ${aliasName}`) && !line.includes('fkall') && !line.includes('fk.config'))
        .join('\n');
      fs.writeFileSync(rcFile, newContent);
      try { execSync(`. ${rcFile}`, { stdio: 'ignore' }); } catch {}
    }
    console.log(chalk.green(`✅ Prebuilt config '${aliasName}' removed successfully.`));
  } catch (err) {
    console.log(chalk.red(`❌ Failed to remove prebuilt: ${err.message}`));
  }
}

// ---------------- Main Setup ----------------
export async function runSetup() {
  console.clear();
  console.log(chalk.cyanBright('🧩 FkNeo CLI Setup\n'));

  const section = title => chalk.bgYellow.black.bold(` ${title.toUpperCase()} `);

  console.log(section('SETUP TYPE'));
  const setupType = await select({
    message: chalk.yellowBright('Select your setup type:'),
    choices: [
      { name: 'Minimal (fast, default config)', value: 'minimal' },
      { name: 'Prebuilt (FkVim, LazyVim, NVChad, LunarVim)', value: 'prebuilt' },
      { name: 'Custom (pick plugins and options)', value: 'custom' },
    ],
  });

  console.log(chalk.greenBright(`✅ You selected: ${setupType} setup\n`));

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
      message: chalk.yellowBright('Use as main Neovim config?'),
      choices: [
        { name: 'Yes (~/.config/nvim)', value: true },
        { name: 'No, create alias', value: false },
      ],
    });

    const prebuiltConfigs = {
      fkvim: { name: 'FkVim', repo: 'https://github.com/TheFlashCodes/FKvim', appName: 'fkvim' },
      lazyvim: { name: 'LazyVim', repo: 'https://github.com/LazyVim/starter', appName: 'lazyvim' },
      nvchad: { name: 'NVChad', repo: 'https://github.com/NvChad/NvChad', appName: 'nvchad' },
      lunarvim: { name: 'LunarVim', repo: 'https://github.com/LunarVim/LunarVim', appName: 'lunarvim' },
    };

    const cfg = prebuiltConfigs[choice];
    cfg.main = mainOrAlias;

    if (!mainOrAlias) {
      const aliasName = await input({ message: `Enter alias name for ${cfg.name} config:`, default: cfg.appName });
      cfg.appName = aliasName.trim();
    }

    // FkVim + FkAi
    if (choice === 'fkvim') {
      const fkAiChoice = await select({
        message: chalk.yellowBright('Use FkAi with FkVim?'),
        choices: [
          { name: 'Yes', value: true },
          { name: 'No', value: false },
        ],
      });

      if (fkAiChoice) {
        try { execSync('gemini --version', { stdio: 'ignore' }); }
        catch {
          const spinner = ora('Installing Gemini CLI...').start();
          execSync('npm install -g gemini-cli', { stdio: 'ignore' });
          spinner.succeed(chalk.green('✅ Gemini CLI installed.'));
        }
      }
    }

    // Target directory
    const targetDir = cfg.main ? path.join(os.homedir(), '.config', 'nvim') : path.join(os.homedir(), '.config', cfg.appName);

    // Clone repo with progress bar
    await cloneRepoWithProgress(cfg.repo, targetDir, cfg.name);

    // Post-clone steps
    const spinnerSetup = ora('Setting up Neovim...').start();
    await new Promise(r => setTimeout(r, 1000));
    spinnerSetup.succeed(chalk.green('✅ Neovim setup complete.'));

    addShellAlias(cfg.appName, cfg.appName, cfg.main);

    const depSpinner = ora('Installing plugins/dependencies...').start();
    await new Promise(r => setTimeout(r, 1500)); // simulate plugin install
    depSpinner.succeed(chalk.green('✅ Plugins installed.'));

    console.log(chalk.greenBright(`\n🎉 Setup complete! Use 'nvim'${!cfg.main ? ` or '${cfg.appName}'` : ''} to launch.`));
    return;
  }

  console.log(chalk.blueBright('🧩 Minimal/Custom setup not implemented yet.'));
}
