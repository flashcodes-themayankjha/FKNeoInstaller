import { input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import chalkAnimation from 'chalk-animation';
import ora from 'ora';
import cliProgress from 'cli-progress';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn, execSync } from 'child_process';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------- Shell Helpers ----------------
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

// ---------------- Multi-Line Clone Progress ----------------
async function cloneRepoWithProgress(repo, targetDir, name) {
  if (fs.existsSync(targetDir)) fs.rmSync(targetDir, { recursive: true, force: true });
  fs.mkdirSync(targetDir, { recursive: true });

  console.log(chalk.blueBright(`\n🔧 Cloning ${name}...\n`));

  const barColor = chalk.hex('#f9e2af');
  const stageBars = {
    connect: new cliProgress.SingleBar({
      format: barColor('[{bar}]') + chalk.white(' {percentage}% ') + chalk.gray('| Connecting...'),
      barCompleteChar: '█', barIncompleteChar: '░', hideCursor: true,
    }),
    receive: new cliProgress.SingleBar({
      format: barColor('[{bar}]') + chalk.white(' {percentage}% ') + chalk.gray('| Receiving objects...'),
      barCompleteChar: '█', barIncompleteChar: '░', hideCursor: true,
    }),
    resolve: new cliProgress.SingleBar({
      format: barColor('[{bar}]') + chalk.white(' {percentage}% ') + chalk.gray('| Resolving deltas...'),
      barCompleteChar: '█', barIncompleteChar: '░', hideCursor: true,
    }),
    finalize: new cliProgress.SingleBar({
      format: barColor('[{bar}]') + chalk.white(' {percentage}% ') + chalk.gray('| Finalizing...'),
      barCompleteChar: '█', barIncompleteChar: '░', hideCursor: true,
    }),
  };

  console.log(chalk.gray('───────────────────────────────────────'));
  stageBars.connect.start(100, 0);
  stageBars.receive.start(100, 0);
  stageBars.resolve.start(100, 0);
  stageBars.finalize.start(100, 0);

  const simulateStage = async (bar, delay, start = 0, end = 100) => {
    const steps = end - start;
    for (let i = start; i <= end; i++) {
      bar.update(i);
      await sleep(delay / steps);
    }
  };

  const git = spawn('git', ['clone', '--progress', repo, targetDir]);

  git.stderr.on('data', (data) => {
    const text = data.toString();
    if (text.includes('Receiving objects')) {
      const match = text.match(/Receiving objects:\s+(\d+)%/);
      if (match) stageBars.receive.update(Number(match[1]));
    } else if (text.includes('Resolving deltas')) {
      const match = text.match(/Resolving deltas:\s+(\d+)%/);
      if (match) stageBars.resolve.update(Number(match[1]));
    }
  });

  const simulateVisuals = (async () => {
    await simulateStage(stageBars.connect, 800);
    await simulateStage(stageBars.receive, 1800);
    await simulateStage(stageBars.resolve, 1200);
    await simulateStage(stageBars.finalize, 1000);
  })();

  return new Promise((resolve, reject) => {
    git.on('close', async (code) => {
      await simulateVisuals;
      Object.values(stageBars).forEach((bar) => bar.update(100));
      Object.values(stageBars).forEach((bar) => bar.stop());
      console.log(chalk.gray('───────────────────────────────────────'));

      if (code === 0) {
        console.log(chalk.green(`✔ ${name} cloned successfully at ${targetDir}\n`));
        resolve();
      } else {
        console.log(chalk.red(`❌ Failed to clone ${name}`));
        reject(new Error('Git clone failed'));
      }
    });
  });
}

// ---------------- Plugin + Gemini Installers ----------------
async function installPlugins(targetDir) {
  console.log(chalk.blueBright('\n📦 Installing all plugins...'));
  const spinner = ora('Installing plugins via Lazy.nvim...').start();
  try {
    execSync(`NVIM_APPNAME="${path.basename(targetDir)}" nvim --headless "+Lazy! sync" +qa`, {
      stdio: 'inherit',
    });
    spinner.succeed(chalk.green('✔ Plugins installed successfully.'));
  } catch {
    spinner.fail(chalk.red('❌ Plugin installation failed.'));
  }
}

async function installGemini() {
  console.log(chalk.blueBright('\n🤖 Installing Gemini CLI...'));
  const spinner = ora('Installing Gemini CLI...').start();
  try {
    execSync('npm install -g gemini-cli', { stdio: 'ignore' });
    spinner.succeed(chalk.green('✔ Gemini CLI installed.'));
  } catch {
    spinner.fail(chalk.red('❌ Failed to install Gemini CLI.'));
  }
}

// ---------------- Step UI ----------------
async function showStep(number, total, label) {
  const catppuccinYellow = '#f9e2af';
  const badge = chalk.bgHex(catppuccinYellow).black.bold(`[Step ${number}/${total}]`);
  const title = chalk.white.bold(` ${label}`);
  console.log(`\n${badge}${title}\n`);
  await sleep(250);
}

// ---------------- Main Setup ----------------
export async function runSetup() {
  console.clear();
  const title = chalkAnimation.rainbow('🧩 FkNeo CLI Setup').start();
  await sleep(900);
  title.stop();

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
        const aliasName = await input({
          message: `Enter alias name for ${selectedConfig.name} config:`,
          default: selectedConfig.appName,
        });
        selectedConfig.appName = aliasName.trim();
      }

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

      const targetDir = selectedConfig.main
        ? path.join(os.homedir(), '.config', 'nvim')
        : path.join(os.homedir(), '.config', selectedConfig.appName);

      await cloneRepoWithProgress(selectedConfig.repo, targetDir, selectedConfig.name);
      await installPlugins(targetDir);

      await showStep(4, 4, 'Finalizing Setup');

      addShellAlias(selectedConfig.appName, selectedConfig.appName, selectedConfig.main);

      // Track all directories for cleanup
      const allDirs = [];
      const baseName = selectedConfig.main ? 'nvim' : selectedConfig.appName;
      if (process.platform === 'win32') {
        allDirs.push(path.join(os.homedir(), 'AppData', 'Local', baseName));
        allDirs.push(path.join(os.homedir(), 'AppData', 'Local', `${baseName}-data`));
      } else {
        allDirs.push(path.join(os.homedir(), '.config', baseName));
        allDirs.push(path.join(os.homedir(), '.local', 'state', baseName));
        allDirs.push(path.join(os.homedir(), '.local', 'share', baseName));
        allDirs.push(path.join(os.homedir(), '.var', 'app', 'io.neovim.nvim', 'config', baseName));
        allDirs.push(path.join(os.homedir(), '.var', 'app', 'io.neovim.nvim', 'data', baseName));
      }

      writeMetadata({
        prebuilt: selectedConfig.name,
        main: selectedConfig.main,
        alias: selectedConfig.appName,
        targetDir,
        aiEnabled: selectedConfig.aiEnabled || false,
        allDirs
      });

      console.log(chalk.greenBright(`
🎉 Setup Complete!
───────────────────────────────────────
Config:     ${selectedConfig.name}
Main:       ${selectedConfig.main ? 'Yes' : 'No'}
Alias:      ${selectedConfig.appName}
AI:         ${selectedConfig.aiEnabled ? 'Enabled' : 'Disabled'}
Location:   ${targetDir}
All Dirs:   ${allDirs.join(', ')}
───────────────────────────────────────
Launch via: ${chalk.cyan(selectedConfig.main ? 'nvim' : selectedConfig.appName)}
`));
      return;
    }

    console.log(chalk.blueBright('🧩 Minimal/Custom setup not implemented yet.\n'));
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

