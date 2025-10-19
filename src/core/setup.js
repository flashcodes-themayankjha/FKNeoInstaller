
// src/core/setup.js
import { input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import Table from 'cli-table3';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { checkNeovimInstalled, checkNerdFontInstalled } from './preflight.js';
import { installFkVim } from '../prebuilt/fkvim.js';
import { installLazyVim } from '../prebuilt/lazyvim.js';
import { installNvChad } from '../prebuilt/nvchad.js';
import { installLunarVim } from '../prebuilt/lunarvim.js';
import { handleExistingConfig } from '../utils/config-utils.js';
import { addShellAlias } from '../utils/alias.js';
import { writeMetadata } from '../utils/meta.js';
import { showStep } from '../utils/steps.js';
import { runGenerator } from './fkneo-generator.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- Read package.json version from project root ---
let version = '0.0.0';
try {
  const pkgPath = path.resolve(
    path.dirname(import.meta.url.replace('file://', '')),
    '../../package.json'
  );
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  version = pkg.version || version;
} catch {
  /* ignore */
}

// --------------------- Main Flow ---------------------
export async function runSetup() {
  console.clear();
  console.log(
    chalk.black.bgYellow.bold(`\n  🧩 FkNeoInstaller v${version}  \n`)
  );

  await checkNeovimInstalled();
  await checkNerdFontInstalled();

  try {
    // Step 1: choose setup type
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

    if (setupType === 'custom') {
      await runGenerator();
      console.log(chalk.cyanBright('\nReturning to FkNeo CLI...\n'));
      return;
    }

    if (setupType !== 'prebuilt') {
      console.log(
        chalk.blueBright('⚠️ Minimal flow is not implemented yet — coming soon!\n')
      );
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
      fkvim: {
        name: 'FkVim',
        repo: 'https://github.com/TheFlashCodes/FKvim',
        defaultApp: 'fkvim',
      },
      lazyvim: {
        name: 'LazyVim',
        repo: 'https://github.com/LazyVim/starter',
        defaultApp: 'lazyvim',
      },
      nvchad: {
        name: 'NVChad',
        repo: 'https://github.com/NvChad/starter',
        defaultApp: 'nvchad',
      },
      lunarvim: {
        name: 'LunarVim',
        repo: 'https://github.com/LunarVim/LunarVim',
        defaultApp: 'lunarvim',
      },
    };

    const p = prebuiltConfigs[choice];
    let aliasName;
    let targetDir;
    let isMain = mainOrAlias;

    // Handle alias or main config logic
    if (!isMain) {
      aliasName = (
        await input({
          message: `Enter alias name for ${p.name} config:`,
          default: p.defaultApp,
        })
      ).trim();

      const resolved = await handleExistingConfig(
        aliasName,
        path.join(os.homedir(), '.config', aliasName)
      );
      aliasName = resolved.aliasName;
      targetDir = resolved.targetDir;
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

    // Step 3: Install
    await showStep(3, 4, 'Install Dependencies and Configure');

    let aiEnabled = false;
    if (choice === 'fkvim') {
      aiEnabled = await installFkVim(p.repo, targetDir, p.name, choice);
    } else if (choice === 'lazyvim') {
      await installLazyVim(p.repo, targetDir, p.name, choice);
    } else if (choice === 'nvchad') {
      await installNvChad(p.repo, targetDir, p.name, choice);
    } else if (choice === 'lunarvim') {
      await installLunarVim(aiEnabled);
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

    // Summary Table
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
      ['Launch', isMain ? 'nvim' : choice === 'lunarvim' ? 'lvim' : aliasName]
    );

    console.log(chalk.bgYellow.black('\n FkNeoInstaller Summary \n'));
    console.log(table.toString());

    console.log(chalk.greenBright('\n🎉 Setup Complete!'));
    console.log(chalk.gray('- Metadata saved at ~/.fkneo/meta.json'));
    console.log(
      chalk.gray('- If something failed, open Neovim and run :Lazy sync or check logs.\n')
    );

    // ✅ DO NOT EXIT THE PROCESS — return to REPL instead
    console.log(chalk.cyanBright('Returning to FkNeo CLI...\n'));
    return;
  } catch (err) {
    if (err && err.name === 'ExitPromptError') {
      console.log(chalk.redBright('\n⚠️ Setup aborted by user.\n'));
      return;
    }
    console.error(
      chalk.red('❌ Unexpected error:'),
      err?.message || err
    );
    return;
  }
}
