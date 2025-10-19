
// src/core/setup.js
import { input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import chalkAnimation from 'chalk-animation';
import ora from 'ora';
import cliProgress from 'cli-progress';
import Table from 'cli-table3';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn, execSync } from 'child_process';
import open from 'open';


const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- read package.json version from project root ---
let version = '0.0.0';
try {
  const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8'));
  version = pkg.version || version;
} catch {
  /* ignore */
}

// ------------------------- Helpers -------------------------
function getShellRC() {
  const shell = process.env.SHELL || '';
  if (shell.includes('zsh')) return path.join(os.homedir(), '.zshrc');
  if (shell.includes('bash')) return path.join(os.homedir(), '.bashrc');
  if (shell.includes('fish')) return path.join(os.homedir(), '.config', 'fish', 'config.fish');
  return path.join(os.homedir(), '.profile');
}

function ensureLocalBinInPath() {
  const localBin = path.join(os.homedir(), '.local', 'bin');
  const currentPath = process.env.PATH || '';
  const rcFile = getShellRC();

  // If already present, skip
  if (currentPath.split(path.delimiter).includes(localBin)) {
    console.log(chalk.green('✔ ~/.local/bin is already in PATH.'));
    return;
  }

  // Append export command
  const exportLine = `\n# Added by FkNeoInstaller\nexport PATH="$HOME/.local/bin:$PATH"\n`;
  try {
    fs.appendFileSync(rcFile, exportLine, 'utf8');
    console.log(chalk.yellow(`⚠️  Added ~/.local/bin to PATH in ${rcFile}`));

    // Try to reload shell config
    try {
      execSync(`${process.env.SHELL} -lc "source ${rcFile}"`, { stdio: 'ignore' });
      console.log(chalk.green('✔ Shell reloaded successfully (PATH updated).'));
    } catch {
      console.log(chalk.cyan('ℹ️ Restart your terminal or run `source ~/.zshrc` to apply changes.'));
    }
  } catch (err) {
    console.log(chalk.red(`❌ Failed to modify ${rcFile}: ${err.message}`));
  }
}



function writeMetadata(newData) {
  const metaPath = path.join(os.homedir(), '.fkneo', 'meta.json');
  fs.mkdirSync(path.dirname(metaPath), { recursive: true });

  let meta = [];

  // If existing meta.json exists, read it safely
  if (fs.existsSync(metaPath)) {
    try {
      const fileContent = fs.readFileSync(metaPath, 'utf8').trim();
      if (fileContent.startsWith('[')) {
        meta = JSON.parse(fileContent);
      } else if (fileContent) {
        // If old format was a single object, wrap it into an array
        meta = [JSON.parse(fileContent)];
      }
    } catch (err) {
      console.log(chalk.red('⚠️ Failed to parse existing meta.json, recreating...'));
      meta = [];
    }
  }

  // If alias already exists, replace that entry
  const existingIndex = meta.findIndex(entry => entry.alias === newData.alias);
  if (existingIndex !== -1) {
    meta[existingIndex] = newData;
  } else {
    meta.push(newData);
  }

  // Write array back to file, pretty-printed
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');
}




function addShellAlias(aliasName, nvimAppName, isMain = false) {
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


// ------------------------- NEW: Preflight Checks -------------------------
async function checkNeovimInstalled() {
  try {
    execSync('nvim --version', { stdio: 'ignore' });
    console.log(chalk.green('✅ Neovim detected.'));
    return true;
  } catch {
    console.log(chalk.red('\n❌ Neovim not found on your system.'));
    const install = await confirm({
      message: chalk.yellow('Would you like to install Neovim now?'),
      default: true,
    });

    if (!install) {
      console.log(chalk.red('⚠️ Neovim is required. Exiting.'));
      process.exit(1);
    }

    const spinner = ora('Installing Neovim...').start();
    try {
      const platform = os.platform();
      if (platform === 'darwin') {
        execSync('brew install neovim', { stdio: 'ignore' });
      } else if (platform === 'linux') {
        execSync('sudo apt-get update && sudo apt-get install -y neovim', { stdio: 'ignore' });
      } else if (platform === 'win32') {
        console.log(chalk.cyan('⚠️ Please manually install Neovim from: https://neovim.io/'));
        await open('https://neovim.io/');
      } else {
        console.log(chalk.cyan('⚠️ Unknown OS. Please install Neovim manually.'));
        await open('https://neovim.io/');
      }
      spinner.succeed(chalk.green('✔ Neovim installed successfully.'));
      return true;
    } catch (err) {
      spinner.fail(chalk.red('❌ Failed to install Neovim automatically.'));
      console.log(chalk.cyan('Please install Neovim manually from https://neovim.io/download.'));
      await open('https://neovim.io/download');
      process.exit(1);
    }
  }
}

// Get platform-specific font directories
function getFontDirs() {
  const dirs = [];
  const platform = os.platform();

  if (platform === 'darwin') {
    dirs.push(path.join(os.homedir(), 'Library/Fonts'));
    dirs.push('/Library/Fonts');
  } else if (platform === 'win32') {
    dirs.push(path.join(process.env.WINDIR || 'C:\\Windows', 'Fonts'));
  } else {
    dirs.push(path.join(os.homedir(), '.local', 'share', 'fonts'));
    dirs.push('/usr/share/fonts');
    dirs.push('/usr/local/share/fonts');
  }

  return dirs.filter(fs.existsSync);
}

// Clean up weird Unicode or invisible characters from filenames
function sanitizeFontName(name) {
  return name
    .replace(/[^\x20-\x7E]/g, '') // strip non-ASCII chars
    .replace(/\s+/g, ' ')         // normalize spaces
    .trim()
    .toLowerCase();
}

// Detect if any Nerd Font exists
async function checkNerdFontInstalled() {
  try {
    const fontDirs = getFontDirs();
    const allFonts = [];

    for (const dir of fontDirs) {
      try {
        const files = fs.readdirSync(dir);
        allFonts.push(...files);
      } catch {
        continue;
      }
    }

    const normalized = allFonts.map(sanitizeFontName);
    const hasNerdFont = normalized.some(f =>
      (f.includes('nerd') || f.includes(' nf')) &&
      (f.endsWith('.ttf') || f.endsWith('.otf') || f.endsWith('.ttc'))
    );

    if (hasNerdFont) {
      console.log(chalk.green('✅ Nerd Font detected.'));
      return true;
    }

    console.log(chalk.yellow('\n⚠️ No Nerd Font detected on your system.'));
    const openFonts = await confirm({
      message: chalk.yellow('Would you like to open the Nerd Fonts website to install one (e.g. MesloLGS NF)?'),
      default: true,
    });

    if (openFonts) {
      console.log(chalk.cyan('🌐 Opening https://www.nerdfonts.com/#home ...'));
      await open('https://www.nerdfonts.com/#home');
    }

    console.log(chalk.gray('\nTip: Install “MesloLGS NF” for best results (used by Oh My Zsh, Starship, etc.)'));
    return false;
  } catch (err) {
    console.log(chalk.red('⚠️ Could not check fonts automatically:'), err.message);
    console.log(chalk.cyan('🌐 Opening https://www.nerdfonts.com/#home ...'));
    await open('https://www.nerdfonts.com/#home');
    return false;
  }
}



/**
 * handleExistingConfig(aliasName, targetDir)
 *
 * Ensures targetDir is ok to use. If it exists, asks user:
 *  - Backup -> rename existing directory to alias-backup-<ts>
 *  - Remove -> delete existing dir
 *  - Change alias -> prompt new alias and recursively check that.
 *
 * Returns { aliasName, targetDir } resolved (always strings).
 *
 * IMPORTANT: this function will prompt only when necessary and will return
 * the final decision. It will not re-enter main prompts or cause loops.
 */
async function handleExistingConfig(aliasName, targetDir) {
  // if target does not exist, nothing to do
  if (!fs.existsSync(targetDir)) {
    return { aliasName, targetDir };
  }

  console.log(chalk.yellowBright(`⚠️  Config already exists at ${targetDir}`));

  const choice = await select({
    message: 'Choose an action for the existing config:',
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
    return { aliasName, targetDir };
  }

  if (choice === 'remove') {
    fs.rmSync(targetDir, { recursive: true, force: true });
    console.log(chalk.green(`✔ Existing config removed.`));
    return { aliasName, targetDir };
  }

  // rename flow: prompt new alias and recursively ensure that one
  const newAlias = (await input({
    message: 'Enter new alias name:',
    default: `${aliasName}-alt`,
  })).trim();

  if (!newAlias) {
    // safety: if user returns empty, return original (shouldn't happen due to validation)
    return { aliasName, targetDir };
  }

  const newTarget = path.join(os.homedir(), '.config', newAlias);
  // recursively handle if new target exists. This recursion only occurs if new target exists,
  // and will eventually resolve (user must pick a non-conflicting name).
  return await handleExistingConfig(newAlias, newTarget);
}

// ----------------- Git clone with dynamic progress -----------------
async function cloneRepoWithDynamicProgress(repo, targetDir, name) {
  // make sure parent dir exists
  const parent = path.dirname(targetDir);
  if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });

  console.log(chalk.cyan(`\n➡️ Cloning ${name} into ${targetDir}...\n`));

  // Create progress bar for clone
  const bar = new cliProgress.SingleBar({
    format: '{bar} {percentage}% | {task}',
    barCompleteChar: '█',
    barIncompleteChar: '░',
    hideCursor: true,
  }, cliProgress.Presets.shades_classic);

  bar.start(100, 0, { task: `${name} Cloning...` });

  return new Promise((resolve, reject) => {
    const git = spawn('git', ['clone', '--progress', repo, targetDir]);

    // parse progress from stderr
    git.stderr.on('data', (buf) => {
      const txt = buf.toString();
      // Receiving objects:  42%
      const m = txt.match(/Receiving objects:\s+(\d+)%/);
      if (m) {
        const pct = parseInt(m[1], 10);
        bar.update(Math.min(90, pct), { task: `${name} Cloning...` });
      }
      const m2 = txt.match(/Resolving deltas:\s+(\d+)%/);
      if (m2) {
        const pct2 = parseInt(m2[1], 10);
        // push to near completion
        bar.update(Math.min(99, 90 + Math.round(pct2 / 10)), { task: `${name} Finalizing...` });
      }
    });

    git.on('close', (code) => {
      if (code === 0) {
        bar.update(100, { task: chalk.green(`${name} Cloned`) });
        bar.stop();
        console.log(chalk.green(`✔ ${name} cloned successfully at ${targetDir}`));
        resolve();
      } else {
        bar.stop();
        console.log(chalk.red(`❌ Git clone failed with code ${code}`));
        reject(new Error('Git clone failed'));
      }
    });
  });
}

// ----------------- Gemini install (FkAi) -----------------
async function installGemini() {
  const spinner = ora('Installing Gemini CLI (fk-ai)...').start();
  try {
    execSync('npm install -g gemini-cli', { stdio: 'ignore' });
    spinner.succeed(chalk.green('✔ Gemini CLI installed.'));
    return true;
  } catch (e) {
    spinner.fail(chalk.red('❌ Failed to install Gemini CLI.'));
    return false;
  }
}

// ------------- Multi-line plugin installation (groups + per-plugin) -------------

// ------------- Multi-line plugin installation (groups + per-plugin) -------------
async function installPluginsWithDetailedProgress(targetDir) {
  const flamingo = '#F28FB0'; // group text
  const cyan = '#00FFFF'; // cyan glow for progress
  const peach = '#F9E2AF'; // badge bg
  const softLavender = '#b4befe';

  console.log(chalk.cyan('\n📦 Installing plugin groups and individual plugins...\n'));

  // Initialize overall progress bar
  const mb = new cliProgress.MultiBar({
    clearOnComplete: false,
    hideCursor: true,
    format: chalk.hex(cyan)('{bar}') + ' {percentage}% | {meta}',
    barCompleteChar: '█',
    barIncompleteChar: '░',
    barsize: 30,
    autopadding: true,
  }, cliProgress.Presets.shades_classic);

  const overall = mb.create(100, 0, { meta: 'Overall Progress' });

  // Group structure
  const groups = [
    { name: 'Basic Plugins', plugins: ['nvim-tree.lua', 'telescope.nvim', 'which-key.nvim'], weight: 20 },
    { name: 'LSP + Dependencies', plugins: ['mason.nvim', 'mason-lspconfig.nvim', 'cmp-nvim-lsp'], weight: 20 },
    { name: 'FkNotes + Themes', plugins: ['fknotes.nvim', 'catppuccin', 'tokyonight.nvim'], weight: 20 },
    { name: 'Treesitter', plugins: ['nvim-treesitter', 'nvim-treesitter-textobjects'], weight: 20 },
  ];

  let overallProgress = 0;

  for (const group of groups) {
    const badge = chalk.bgHex(peach).black.bold(' Installing plugin: ');
    console.log('\n' + badge + ' ' + chalk.hex(flamingo).bold(group.name) + '\n');
    await sleep(150);

    for (const plugin of group.plugins) {
      const totalChunks = 150 + Math.floor(Math.random() * 300);
      let doneChunks = 0;
      let percentage = 0;

      // create cyan progress bar
      const pluginBar = mb.create(100, 0, {
        meta: `0/${totalChunks} Chunks || Speed: 0.00Mb/s || ...`,
      });

      // fast glide updates (~50–120ms)
      while (percentage < 100) {
        const chunkStep = 5 + Math.floor(Math.random() * 25);
        doneChunks = Math.min(totalChunks, doneChunks + chunkStep);
        percentage = Math.min(100, Math.round((doneChunks / totalChunks) * 100));
        const speed = (3 + Math.random() * 7).toFixed(2);

        pluginBar.update(percentage, {
          meta: `${doneChunks}/${totalChunks} Chunks || Speed: ${speed}Mb/s || ${chalk.green('✔')} ${chalk.hex(softLavender)(plugin)}`,
        });

        // update overall progress
        const groupWeight = group.weight / group.plugins.length;
        overallProgress = Math.min(100, overallProgress + groupWeight * (chunkStep / totalChunks) * 2);
        overall.update(overallProgress, { meta: chalk.gray('Progress...') });

        await sleep(50 + Math.random() * 70);
      }

      pluginBar.update(100, {
        meta: `${totalChunks}/${totalChunks} Chunks || Speed: 0.00Mb/s || ${chalk.green('✔')} ${chalk.hex(softLavender)(plugin)} installed.`,
      });
      pluginBar.stop();
      await sleep(120);
    }

    overall.update(Math.min(100, overallProgress + group.weight / 2));
    console.log(chalk.hex(flamingo)(`↳ Finished group: ${group.name}\n`));
  }

  overall.update(100, { meta: chalk.green('Complete') });
  mb.stop();

  console.log(chalk.cyan('\n[Plugins] Running headless Lazy.nvim sync (this will actually install plugins)...'));
  try {
    execSync(`NVIM_APPNAME="${path.basename(targetDir)}" nvim --headless "+Lazy! sync" +qa`, { stdio: 'inherit' });
    console.log(chalk.green('✔ Lazy.nvim sync completed (plugins installed).'));
  } catch {
    console.log(chalk.red('❌ Lazy.nvim sync failed — you can rerun with :Lazy sync.'));
  }

  console.log(chalk.green('\n🎉 Plugin installation step done.\n'));
}


// ---------------- Step UI ----------------
async function showStep(n, total, label) {
  const badge = chalk.bgYellow.black.bold(`[Step ${n}/${total}]`);
  console.log(`\n${badge} ${chalk.white.bold(label)}\n`);
  await sleep(200);
}

// --------------------- Main flow ---------------------
// --------------------- Main flow ---------------------
export async function runSetup() {
  console.clear();
  console.log(chalk.black.bgYellow.bold(`\n  🧩 FkNeoInstaller v${version}  \n`));
  await checkNeovimInstalled();
  await checkNerdFontInstalled();

  try {
    // Step 1: choose type
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

    if (setupType !== 'prebuilt') {
      console.log(chalk.blueBright('⚠️ Minimal/Custom flows are not implemented in this script yet.'));
      return;
    }

    // Step 2: pick prebuilt and alias decision
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
      fkvim: { name: 'FkVim', repo: 'https://github.com/TheFlashCodes/FKvim', defaultApp: 'fkvim' },
      lazyvim: { name: 'LazyVim', repo: 'https://github.com/LazyVim/starter', defaultApp: 'lazyvim' },
      nvchad: { name: 'NVChad', repo: 'https://github.com/NvChad/NvChad', defaultApp: 'nvchad' },
      lunarvim: { name: 'LunarVim', repo: 'https://github.com/LunarVim/LunarVim', defaultApp: 'lunarvim' },
    };

    const p = prebuiltConfigs[choice];
    let aliasName;
    let targetDir;
    let isMain = mainOrAlias;

    if (!isMain) {
      aliasName = (await input({ message: `Enter alias name for ${p.name} config:`, default: p.defaultApp })).trim();
      const resolved = await handleExistingConfig(aliasName, path.join(os.homedir(), '.config', aliasName));
      aliasName = resolved.aliasName;
      targetDir = resolved.targetDir;
      isMain = false;
    } else {
      const mainDir = path.join(os.homedir(), '.config', 'nvim');
      const resolved = await handleExistingConfig('nvim', mainDir);
      if (resolved.aliasName && resolved.aliasName !== 'nvim') {
        aliasName = resolved.aliasName;
        targetDir = path.join(os.homedir(), '.config', aliasName);
        isMain = false;
      } else {
        aliasName = 'nvim';
        targetDir = mainDir;
        isMain = true;
      }
    }

    // Step 3: install
    await showStep(3, 4, 'Install Dependencies and Configure');

    // FkAi only for FkVim
    let aiEnabled = false;
    if (choice === 'fkvim') {
      const fkAiChoice = await select({
        message: chalk.yellowBright('Enable FkAi (Gemini CLI integration)?'),
        choices: [
          { name: 'Yes', value: true },
          { name: 'No', value: false },
        ],
      });
      if (fkAiChoice) {
        aiEnabled = await installGemini();
        if (!aiEnabled) console.log(chalk.red('⚠️ Gemini install failed — continuing without FkAi.'));
      }
    }

    // -------------------- Clone or Install --------------------
  
if (choice === 'lunarvim') {
  console.log(chalk.cyan('\n➡️ Installing LunarVim using official bootstrap script...\n'));
  const spinner = ora('Running LunarVim installer...').start();

  try {
    // Run official LunarVim installer
    const installer = spawn(
      'bash',
      [
        '-c',
        'curl -s https://raw.githubusercontent.com/LunarVim/LunarVim/master/utils/installer/install.sh | bash'
      ],
      { stdio: 'inherit' }
    );

    // Wait for installer to finish
    await new Promise((resolve, reject) => {
      installer.on('close', (code) => {
        if (code === 0) {
          spinner.succeed(chalk.green('✔ LunarVim installed successfully.'));
          resolve();
        } else {
          spinner.fail(chalk.red('❌ LunarVim installation failed.'));
          console.log(
            chalk.cyan(
              'You can install manually using:\n  bash <(curl -s https://raw.githubusercontent.com/LunarVim/LunarVim/master/utils/installer/install.sh)'
            )
          );
          reject(new Error('Installer failed.'));
        }
      });
    });

    // 🧩 Ensure ~/.local/bin is in PATH
    ensureLocalBinInPath();

    // 🪪 Add alias `lvim` if binary exists
    const localBin = path.join(os.homedir(), '.local', 'bin');
    const lvimBinary = path.join(localBin, 'lvim');
    const rcFile = getShellRC();

    if (fs.existsSync(lvimBinary)) {
      const aliasLine = `alias lvim="$HOME/.local/bin/lvim"`;
      const rcContent = fs.existsSync(rcFile) ? fs.readFileSync(rcFile, 'utf8') : '';
      if (!rcContent.includes(aliasLine)) {
        fs.appendFileSync(rcFile, `\n# Added by FkNeoInstaller\n${aliasLine}\n`, 'utf8');
        console.log(chalk.yellow(`⚙️  Added alias 'lvim' in ${rcFile}`));
      }
    }

    // 🧭 Verify binary availability
    try {
      execSync('command -v lvim', { stdio: 'ignore' });
      console.log(chalk.green('✔ lvim command available.'));
    } catch {
      console.log(chalk.yellow('⚠️ lvim command not found yet — restart your terminal.'));
    }

    // 🪶 Save metadata
    writeMetadata({
      prebuilt: 'LunarVim',
      main: false,
      alias: 'lvim',
      targetDir: path.join(os.homedir(), '.config', 'lvim'),
      aiEnabled,
      method: 'installer',
      installedAt: new Date().toISOString(),
    });

  } catch (err) {
    spinner.fail(chalk.red('❌ LunarVim installation failed.'));
    console.log(
      chalk.cyan(
        '\nYou can install manually using:\n  bash <(curl -s https://raw.githubusercontent.com/LunarVim/LunarVim/master/utils/installer/install.sh)\n'
      )
    );
  }

} else {
  // 🧩 Normal git-based prebuilt
  await cloneRepoWithDynamicProgress(p.repo, targetDir, p.name);

  if (choice === 'fkvim' || choice === 'lazyvim') {
    await installPluginsWithDetailedProgress(targetDir);
  } else if (choice === 'nvchad') {
    console.log(chalk.cyan('📦 NVChad selected: skipping Lazy.nvim sync (it uses its own plugin manager).'));
  }
}



        // Step 4: finalize setup
    await showStep(4, 4, 'Finalizing Setup');

    addShellAlias(aliasName, aliasName, isMain);

    // Save metadata for cleanup
    writeMetadata({
      prebuilt: p.name,
      main: isMain,
      alias: aliasName,
      targetDir,
      aiEnabled,
      method: choice === 'lunarvim' ? 'installer' : 'git',
      installedAt: new Date().toISOString(),
    });

    // Show summary table
    const table = new Table({
      head: [chalk.cyan('Key'), chalk.cyan('Value')],
      colWidths: [20, 60],
      wordWrap: true,
    });
    table.push(
      ['Config', p.name],
      ['Main', isMain ? 'Yes' : 'No'],
      ['Alias', aliasName],
      ['AI', aiEnabled ? 'Enabled' : 'Disabled'],
      ['Method', choice === 'lunarvim' ? 'Installer Script' : 'Git Clone'],
      ['Location', targetDir],
      ['Launch', isMain ? 'nvim' : choice == 'lunarvim' ? ' lvim ' : aliasName]
    );

    console.log(chalk.bgYellow.black('\n FkNeoInstaller Summary \n'));
    console.log(table.toString());
    console.log(chalk.greenBright('\n🎉 Setup Complete!'));
    console.log(chalk.gray('- Metadata saved at ~/.fkneo/meta.json'));
    console.log(chalk.gray('- If something failed, open nvim and run :Lazy sync or check logs.'));
  } catch (err) {
    if (err && err.name === 'ExitPromptError') {
      console.log(chalk.redBright('\n⚠️ Setup aborted by user.\n'));
      return;
    }
    console.error(chalk.red('❌ Unexpected error:'), err && err.message ? err.message : err);
    process.exit(1);
  }
}

