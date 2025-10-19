
import fs from "fs";
import os from "os";
import path from "path";
import chalk from "chalk";
import chalkAnimation from "chalk-animation";
import cliProgress from "cli-progress";
import { input, select, checkbox } from "@inquirer/prompts";
import { execSync } from "child_process";

// ---------------------------------------------------------------
// 🧱 Helpers
// ---------------------------------------------------------------
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function appendAlias(aliasName, configName) {
  const shell = process.env.SHELL || "";
  const rcFile =
    shell.includes("zsh") || shell.includes("oh-my-zsh")
      ? path.join(os.homedir(), ".zshrc")
      : path.join(os.homedir(), ".bashrc");

  const aliasLine = `\n# FkNeo Alias for ${aliasName}\nalias ${aliasName}='NVIM_APPNAME="${configName}" nvim'\n`;
  const content = fs.existsSync(rcFile) ? fs.readFileSync(rcFile, "utf8") : "";

  if (!content.includes(`alias ${aliasName}=`)) {
    fs.appendFileSync(rcFile, aliasLine);
    console.log(chalk.greenBright(`✔ Alias '${aliasName}' added to ${rcFile}`));
  } else {
    console.log(chalk.yellow(`⚠️ Alias '${aliasName}' already exists.`));
  }
}

const badge = (text) => chalk.bgYellow.black(` ${text} `);
const success = (text) => chalk.greenBright(`✔ ${text}`);
const step = (n, label) => chalk.cyanBright(`\n[Step ${n}] ${label}`);

// ---------------------------------------------------------------
// 🎛️ Fancy Plugin Progress Simulation
// ---------------------------------------------------------------
function simulatePluginInstall(pluginName, totalChunks = 200) {
  return new Promise((resolve) => {
    console.log(badge(`Installing plugin: ${pluginName}`));

    // Create progress bar
    const bar = new cliProgress.SingleBar(
      {
        format:
          `${chalk.cyanBright("{bar}")} {percentage}% | {value}/{total} chunks | ` +
          chalk.gray("Speed: {speed} MB/s"),
        barCompleteChar: "█",
        barIncompleteChar: "░",
        hideCursor: true,
      },
      cliProgress.Presets.shades_classic
    );

    bar.start(totalChunks, 0, { speed: "0.00" });

    let speed = 0.5 + Math.random() * 1.5;
    const timer = setInterval(() => {
      const increment = Math.ceil(Math.random() * 6);
      speed = (Math.random() * 8 + 2).toFixed(2);
      bar.increment(increment, { speed });

      if (bar.value >= totalChunks) {
        clearInterval(timer);
        bar.stop();
        console.log(chalk.greenBright(`✔ ${pluginName} installed.\n`));
        resolve();
      }
    }, 60);
  });
}

// ---------------------------------------------------------------
// 🧩 Plugin definitions
// ---------------------------------------------------------------
const basePlugins = [
  { name: "nvim-treesitter", repo: "nvim-treesitter/nvim-treesitter" },
  { name: "lualine.nvim", repo: "nvim-lualine/lualine.nvim" },
  { name: "bufferline.nvim", repo: "akinsho/bufferline.nvim" },
  { name: "nvim-cmp", repo: "hrsh7th/nvim-cmp" },
  { name: "cmp-nvim-lsp", repo: "hrsh7th/cmp-nvim-lsp" },
  { name: "friendly-snippets", repo: "rafamadriz/friendly-snippets" },
  { name: "which-key.nvim", repo: "folke/which-key.nvim" },
];

const extraPlugins = [
  { name: "telescope.nvim", repo: "nvim-telescope/telescope.nvim" },
  { name: "neo-tree.nvim", repo: "nvim-neo-tree/neo-tree.nvim" },
  { name: "nui.nvim", repo: "MunifTanjim/nui.nvim" },
  { name: "plenary.nvim", repo: "nvim-lua/plenary.nvim" },
  { name: "nvim-lspconfig", repo: "neovim/nvim-lspconfig" },
];

// Always included themes
const themePlugins = [
  { name: "catppuccin", repo: "catppuccin/nvim" },
  { name: "tokyonight.nvim", repo: "folke/tokyonight.nvim" },
];

// ---------------------------------------------------------------
// ⚙️ Main Generator
// ---------------------------------------------------------------
export async function runGenerator() {
  console.clear();
  console.log(badge("FKNeo Config Generator"));
  console.log(chalk.gray("Create your custom Neovim setup interactively.\n"));

  const configName = await input({
    message: chalk.yellow("Enter a name for your Neovim setup (e.g. myvim):"),
    default: "myvim",
  });

  const aliasName = await input({
    message: chalk.yellow("Enter alias to launch it (e.g. myvim):"),
    default: configName,
  });

  const pluginManager = await select({
    message: chalk.yellow("Choose plugin manager:"),
    choices: [
      { name: "Lazy.nvim (recommended)", value: "lazy" },
      { name: "vim-plug", value: "plug" },
    ],
  });

  const features = await checkbox({
    message: chalk.yellow("Select core features to include:"),
    choices: basePlugins.map((p) => ({ name: p.name, value: p })),
  });

  const extras = await checkbox({
    message: chalk.yellow("Select optional plugins to include:"),
    choices: extraPlugins.map((p) => ({ name: p.name, value: p })),
  });

  const enableLSP = extras.some((p) => p.name === "nvim-lspconfig");

  const colorScheme = await select({
    message: chalk.yellow("Choose default color scheme:"),
    choices: [
      { name: "Catppuccin (Mocha)", value: "catppuccin-mocha" },
      { name: "Tokyo Night", value: "tokyonight-night" },
    ],
  });

  // ---------------------------------------------------------------
  // 🧠 Directories
  // ---------------------------------------------------------------
  const configDir = path.join(os.homedir(), ".config", configName);
  const luaDir = path.join(configDir, "lua");
  ensureDir(luaDir);

  // ---------------------------------------------------------------
  // ✍️ init.lua
  // ---------------------------------------------------------------
  let initLua = `
-- ${configName} init.lua
require("plugins")

-- =========================
-- 🖌️ Theme Setup
-- =========================
vim.cmd.colorscheme("${colorScheme}")

-- Safe Theme Switcher
function SwitchTheme(theme)
  local ok, _ = pcall(vim.cmd, "colorscheme " .. theme)
  if ok then
    vim.notify("🌈 Switched to theme: " .. theme, vim.log.levels.INFO)
  else
    vim.notify("❌ Theme not found: " .. theme, vim.log.levels.ERROR)
  end
end
`;

  if (enableLSP) {
    initLua += `
-- =========================
-- 🧠 LSP Setup
-- =========================
vim.lsp.config["lua_ls"] = {}
vim.lsp.enable("lua_ls")
`;
  }

  // ---------------------------------------------------------------
  // 📦 plugins.lua
  // ---------------------------------------------------------------
  const allPlugins = [...features, ...extras, ...themePlugins];
  const pluginList = allPlugins.map((p) => `"${p.repo}"`);

  let pluginsLua = "";
  if (pluginManager === "lazy") {
    pluginsLua = `
-- Lazy.nvim bootstrap
local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"
if not vim.loop.fs_stat(lazypath) then
  vim.fn.system({
    "git",
    "clone",
    "--filter=blob:none",
    "https://github.com/folke/lazy.nvim.git",
    "--branch=stable",
    lazypath,
  })
end
vim.opt.rtp:prepend(lazypath)

require("lazy").setup({
  ${pluginList.join(",\n  ")}
})
`;
  } else {
    pluginsLua = `
-- vim-plug bootstrap
local Plug = vim.fn["plug#"]
vim.call("plug#begin", "~/.local/share/nvim/plugged")

${pluginList.map((p) => `Plug('${p.repo}')`).join("\n")}

vim.call("plug#end()")
`;
  }

  fs.writeFileSync(path.join(configDir, "init.lua"), initLua.trim());
  fs.writeFileSync(path.join(luaDir, "plugins.lua"), pluginsLua.trim());

  // ---------------------------------------------------------------
  // ⚙️ Simulated Install Progress (Visual)
  // ---------------------------------------------------------------
  console.log(chalk.hex("#F2CDCD")(`\n🌸 Installing group: Basic Plugins\n`));
  for (const p of features) await simulatePluginInstall(p.name);

  console.log(chalk.hex("#F2CDCD")(`\n🌸 Installing group: Extra Plugins\n`));
  for (const p of extras) await simulatePluginInstall(p.name);

  console.log(chalk.hex("#F2CDCD")(`\n🌸 Installing group: Themes\n`));
  for (const p of themePlugins) await simulatePluginInstall(p.name);

  // ---------------------------------------------------------------
  // 🧩 Add alias
  // ---------------------------------------------------------------
  appendAlias(aliasName, configName);

  // ---------------------------------------------------------------
  // 🎉 Done
  // ---------------------------------------------------------------
  console.log(success(`\n✅ Neovim config created at ${configDir}`));
  console.log(success(`Plugin manager: ${pluginManager}`));
  console.log(success(`Color scheme: ${colorScheme}`));
  console.log(success(`Alias: ${aliasName}`));
  console.log(chalk.gray("\nLaunch with:"));
  console.log(chalk.cyan(`  ${aliasName}\n`));
}

// Run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => await runGenerator())();
}
