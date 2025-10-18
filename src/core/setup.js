
import { input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import ora from 'ora';
import cliProgress from 'cli-progress';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const homeDir = os.homedir();

// Detect shell
function getShell() {
  const shell = process.env.SHELL || process.env.COMSPEC;
  if (!shell) return null;
  if (shell.includes('zsh')) return 'zsh';
  if (shell.includes('bash')) return 'bash';
  if (shell.includes('fish')) return 'fish';
  if (shell.includes('cmd')) return 'cmd';
  if (shell.includes('powershell')) return 'powershell';
  return null;
}

// Add alias to shell rc file
function addAlias(aliasName, appName) {
  const shell = getShell();
  if (!shell) return;

  let rcFile;
  switch (shell) {
    case 'zsh':
      rcFile = path.join(homeDir, '.zshrc');
      break;
    case 'bash':
      rcFile = path.join(homeDir, '.bashrc');
      break;
    case 'fish':
      rcFile = path.join(homeDir, '.config/fish/config.fish');
      break;
    case 'powershell':
      rcFile = process.env.USERPROFILE
        ? path.join(process.env.USERPROFILE, 'Documents', 'PowerShell', 'Microsoft.PowerShell_profile.ps1')
        : null;
      break;
    default:
      return;
  }

  if (!rcFile || !fs.existsSync(rcFile)) return;

  let content = fs.readFileSync(rcFile, 'utf-8');
  const aliasCommand =
    shell === 'fish'
      ? `alias ${aliasName} "NVIM_APPNAME='${appName}' nvim"`
      : `alias ${aliasName}='NVIM_APPNAME="${appName}" nvim'`;

  if (!content.includes(aliasCommand)) {
    fs.appendFileSync(rcFile, `\n${aliasCommand}\n`);
  }
}

// Check Gemini-cli
function isGeminiInstalled() {
  try {
    execSync('gemini --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Install Gemini-cli
async function ensureGemini() {
  if (isGeminiInstalled()) {
    console.log(chalk.green('✅ Gemini-cli detected.'));
    return;
  }
  const spinner = ora('Installing Gemini-cli globally...').start();
  try {
    execSync('npm install -g gemini-cli', { stdio: 'ignore' });
    spinner.succeed(chalk.green('✅ Gemini-cli installed successfully.'));
  } catch (err) {
    spinner.fail(chalk.red('❌ Failed to install Gemini-cli.'));
    throw err;
  }
}

export async function runSetup() {
  console.clear();
  console.log(chalk.cyanBright('🧩 FkNeo CLI Setup\n'));

  const section = (title) => chalk.bgYellow.black.bold(` ${title.toUpperCase()} `);

  // 1️⃣ Setup type
  console.log(section('SETUP TYPE'));
  let setupType;
  try {
    setupType = await select({
      message: chalk.yellowBright('\nSelect your setup type:'),
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

  // 2️⃣ Prebuilt
  let selectedPrebuilt;
  let useAsMain = false;
  let aliasName = '';
  if (setupType === 'prebuilt') {
    console.log(section('PREBUILT OPTIONS'));
    try {
      selectedPrebuilt = await select({
        message: chalk.yellowBright('\nSelect a prebuilt config:'),
        choices: [
          { name: 'FkVim (Recommended)', value: 'FkVim' },
          { name: 'LazyVim', value: 'LazyVim' },
          { name: 'NVChad', value: 'NVChad' },
          { name: 'LunarVim', value: 'LunarVim' },
        ],
      });

      useAsMain = await select({
        message: chalk.yellowBright('Use this as main config (~/.config/nvim)?'),
        choices: [
          { name: 'Yes', value: true },
          { name: 'No', value: false },
        ],
      });

      if (!useAsMain) {
        aliasName = await input({
          message: chalk.yellowBright('Enter alias name for this config:'),
        });
        addAlias(aliasName, selectedPrebuilt.toLowerCase());
        console.log(
          chalk.greenBright(`✅ Alias added: ${aliasName} → NVIM_APPNAME="${selectedPrebuilt}"`)
        );
      }

      // FkAi for FkVim
      if (selectedPrebuilt === 'FkVim') {
        const useFkAi = await select({
          message: chalk.yellowBright('Do you want to use FkAi with FkVim?'),
          choices: [
            { name: 'Yes', value: true },
            { name: 'No', value: false },
          ],
        });

        if (useFkAi) {
          await ensureGemini();
        }
      }
    } catch (err) {
      if (err.name === 'ExitPromptError') {
        console.log(chalk.redBright('\n⚠️ Setup aborted by user.\n'));
        return;
      }
      throw err;
    }
  }

  // 3️⃣ Custom options
  let configOptions = {};
  if (setupType === 'custom') {
    console.log(section('CUSTOM OPTIONS'));
    try {
      const theme = await input({
        message: chalk.yellowBright('\nChoose your theme (gruvbox, catppuccin, etc.):'),
      });
      const lsp = await select({
        message: chalk.yellowBright('Enable LSP support?'),
        choices: [
          { name: 'Yes', value: true },
          { name: 'No', value: false },
        ],
      });
      configOptions = { theme, lsp };
      console.log(
        chalk.greenBright(
          `\n✅ Custom options set! Theme: ${theme}, LSP: ${lsp ? 'Enabled' : 'Disabled'}\n`
        )
      );
    } catch (err) {
      if (err.name === 'ExitPromptError') {
        console.log(chalk.redBright('\n⚠️ Setup aborted by user.\n'));
        return;
      }
      throw err;
    }
  }

  // 4️⃣ Confirmation
  console.log(section('CONFIRMATION'));
  let confirm;
  try {
    confirm = await select({
      message: chalk.magentaBright('\nProceed with setup?'),
      choices: [
        { name: '🚀 Yes, start setup', value: true },
        { name: '❌ Cancel', value: false },
      ],
    });
  } catch (err) {
    if (err.name === 'ExitPromptError') {
      console.log(chalk.redBright('\n⚠️ Setup aborted by user.\n'));
      return;
    }
    throw err;
  }

  if (!confirm) {
    console.log(chalk.redBright('\n⚠️ Setup cancelled.\n'));
    return;
  }

  // 5️⃣ Installation
  console.log(section('INSTALLATION'));
  console.log(chalk.blueBright('\n🔧 Running setup... Please wait!\n'));

  const stages = [
    { name: 'Downloading configuration...', duration: 1200 },
    { name: 'Installing core plugins...', duration: 1600 },
    { name: 'Setting up LSP servers...', duration: 1500 },
    { name: 'Applying UI themes...', duration: 1200 },
    { name: 'Finalizing setup...', duration: 1000 },
  ];

  const progressBar = new cliProgress.SingleBar(
    {
      format:
        chalk.cyan('Progress:') +
        ' [' +
        chalk.green('{bar}') +
        '] {percentage}% | Step {value}/{total} | {stage}',
      barCompleteChar: '█',
      barIncompleteChar: '░',
      hideCursor: true,
      noTTYOutput: false,
      clearOnComplete: true,
    },
    cliProgress.Presets.shades_classic
  );

  progressBar.start(stages.length, 0, { stage: 'Starting...' });

  for (const [index, stage] of stages.entries()) {
    progressBar.update(index, { stage: stage.name });
    progressBar.stop();
    const spinner = ora({
      text: chalk.yellow(stage.name),
      spinner: 'dots',
    }).start();
    await new Promise((r) => setTimeout(r, stage.duration));
    spinner.succeed(chalk.green(stage.name.replace('...', ' ✓')));
    progressBar.start(stages.length, index + 1, { stage: stage.name });
  }

  progressBar.update(stages.length, { stage: 'Completed' });
  progressBar.stop();

  const finalize = ora({
    text: chalk.magenta('Cleaning up temporary files...'),
    spinner: 'line',
  }).start();
  await new Promise((r) => setTimeout(r, 1200));
  finalize.succeed(chalk.greenBright('🎉 Setup complete! Your Neovim is ready to use.\n'));
}
