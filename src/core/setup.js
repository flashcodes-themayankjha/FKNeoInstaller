
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
export async function runSetup() {
  console.clear();
  console.log(chalk.black.bgYellow.bold(`\n  🧩 FkNeoInstaller v${version}  \n`));

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
      // ask alias name
      aliasName = (await input({ message: `Enter alias name for ${p.name} config:`, default: p.defaultApp })).trim();
      // resolve existing config (backup/remove/rename)
      const resolved = await handleExistingConfig(aliasName, path.join(os.homedir(), '.config', aliasName));
      aliasName = resolved.aliasName;
      targetDir = resolved.targetDir; // may be original or renamed/resolved
      isMain = false;
    } else {
      // main config chosen: check ~/.config/nvim
      const mainDir = path.join(os.homedir(), '.config', 'nvim');
      const resolved = await handleExistingConfig('nvim', mainDir);
      // If user renamed to something other than 'nvim', treat as alias instead of main
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

    // Clone config
    await cloneRepoWithDynamicProgress(p.repo, targetDir, p.name);

    // Detailed plugin installs for FkVim & LazyVim
    if (choice === 'fkvim' || choice === 'lazyvim') {
      await installPluginsWithDetailedProgress(targetDir);
    } else {
      console.log(chalk.cyan('📦 NVChad/LunarVim selected: skipped detailed plugin sync (they manage plugins differently).'));
    }

    // Step 4: finalize
    await showStep(4, 4, 'Finalizing Setup');

    addShellAlias(aliasName, aliasName, isMain);

    // write metadata for future cleaning
    writeMetadata({
      prebuilt: p.name,
      main: isMain,
      alias: aliasName,
      targetDir,
      aiEnabled,
      installedAt: new Date().toISOString(),
    });

    // summary
    const table = new Table({ head: [chalk.cyan('Key'), chalk.cyan('Value')], colWidths: [20, 60], wordWrap: true });
    table.push(
      ['Config', p.name],
      ['Main', isMain ? 'Yes' : 'No'],
      ['Alias', aliasName],
      ['AI', aiEnabled ? 'Enabled' : 'Disabled'],
      ['Location', targetDir],
      ['Launch', isMain ? 'nvim' : aliasName]
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
