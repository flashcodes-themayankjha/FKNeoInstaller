
import chalk from "chalk";
import Conf from "conf";
import os from "os";
import path from "path";
import fs from "fs";
import ora from "ora";
import { confirm } from "@inquirer/prompts";

import { runSetup } from "./setup.js";
import { runClean } from "./clean.js";
import { runGenerator } from "./fkneo-generator.js";
import { installFkVim } from "../prebuilt/fkvim.js";
import { installLazyVim } from "../prebuilt/lazyvim.js";
import { installNvChad } from "../prebuilt/nvchad.js";
import { installLunarVim } from "../prebuilt/lunarvim.js";
import { addShellAlias } from "../utils/alias.js";
import { writeMetadata } from "../utils/meta.js";

const config = new Conf({ projectName: "fkneo-cli" });

export async function handleCommand(cmd) {
  const input = cmd.trim().toLowerCase();
  const [command, ...args] = input.split(/\s+/);
  const flags = new Set(args);

  const section = (title, color = chalk.bgYellow.black) =>
    color.bold(` ${title.toUpperCase()} `);

  // ---------------- HELP ----------------
  switch (command) {
    case "help": {
      const usage = `
${section("⚙️  USAGE")}

  ${chalk.cyanBright("$ fkneo-cli")} ${chalk.white("<command> [option]")}
`;

      const commands = `
${section("⌘  COMMANDS")}

  ${chalk.greenBright("help").padEnd(15)} Show help menu
  ${chalk.greenBright("setup").padEnd(15)} Launch guided setup wizard
  ${chalk.greenBright("install").padEnd(15)} Install a Neovim preset
  ${chalk.greenBright("generate").padEnd(15)} Generate a custom config
  ${chalk.greenBright("clean").padEnd(15)} Remove installed presets
  ${chalk.greenBright("reset-auth").padEnd(15)} Clear GitHub credentials
  ${chalk.greenBright("quit").padEnd(15)} Exit CLI
  ${chalk.greenBright("exit").padEnd(15)} Same as quit
`;

      const options = `
${section("🛠️  INSTALL FLAGS")}

  ${chalk.yellowBright("--fkvim").padEnd(20)} Install FkVim
  ${chalk.yellowBright("--lazyvim").padEnd(20)} Install LazyVim
  ${chalk.yellowBright("--nvchad").padEnd(20)} Install NvChad
  ${chalk.yellowBright("--lunarvim").padEnd(20)} Install LunarVim
  ${chalk.yellowBright("--alias <name>").padEnd(20)} Use custom CLI alias
  ${chalk.yellowBright("--main").padEnd(20)} Set config as main (~/.config/nvim)
  ${chalk.yellowBright("--help").padEnd(20)} Show install-specific help

💡 Tip: Run ${chalk.cyan("fkneo install --help")} for install-only help.
`;

      console.log(`${usage}${commands}${options}`);
      return false;
    }

    // ---------------- SETUP ----------------
    case "setup":
      console.log(chalk.cyanBright("\n🚀 Launching setup wizard...\n"));
      await runSetup();
      console.log(chalk.greenBright("\n✅ Setup complete! Returning to FkNeo CLI...\n"));
      return false;

    // ---------------- GENERATOR ----------------
    case "generate":
      console.log(chalk.cyanBright("\n🧩 Starting custom generator...\n"));
      await runGenerator();
      console.log(chalk.greenBright("\n✅ Generation complete! Returning to FkNeo CLI...\n"));
      return false;

    // ---------------- INSTALL ----------------
    case "install": {
      // 🎯 Show help if no flags OR --help
      if (args.length === 0 || flags.has("--help")) {
        console.log(chalk.bgBlueBright.black.bold("\n 💠  FkNeo INSTALL MODE HELP  💠 \n"));

        console.log(`
${chalk.bgMagenta.black.bold(" ⚙️  HOW TO USE ")}

  ${chalk.cyanBright("fkneo install")} ${chalk.white("<preset> [options]")}

${chalk.bgGreen.black.bold(" 📦 AVAILABLE PRESETS ")}
  ${chalk.yellow("--fkvim")}       → Install FkVim (https://github.com/TheFlashCodes/FKvim)
  ${chalk.yellow("--lazyvim")}     → Install LazyVim (https://github.com/LazyVim/starter)
  ${chalk.yellow("--nvchad")}      → Install NvChad (https://github.com/NvChad/starter)
  ${chalk.yellow("--lunarvim")}    → Install LunarVim (https://github.com/LunarVim/LunarVim)

${chalk.bgYellow.black.bold(" ⚡ OPTIONS ")}
  ${chalk.yellow("--alias <name>")}   → Use custom name for the config
  ${chalk.yellow("--main")}           → Make it your main Neovim setup (~/.config/nvim)
  ${chalk.yellow("--help")}           → Show this help screen

${chalk.bgCyan.black.bold(" 🌈 EXAMPLES ")}
  ${chalk.cyan("fkneo install --fkvim")}
  ${chalk.cyan("fkneo install --lazyvim --main")}
  ${chalk.cyan("fkneo install --nvchad --alias nvcustom")}
  ${chalk.cyan("fkneo install --lunarvim --main --alias lunar")}

${chalk.bgGray.black.bold(" 💡 TIP ")}
  Run ${chalk.green("fkneo help")} for the full command list.
`);
        return false;
      }

      console.log(chalk.bgYellow.black.bold("\n ⚙️  FkNeo Quick Install Mode \n"));

      const home = os.homedir();
      const configDir = path.join(home, ".config");

      const installs = {
        "--fkvim": { fn: installFkVim, name: "FkVim", repo: "https://github.com/TheFlashCodes/FKvim" },
        "--lazyvim": { fn: installLazyVim, name: "LazyVim", repo: "https://github.com/LazyVim/starter" },
        "--nvchad": { fn: installNvChad, name: "NvChad", repo: "https://github.com/NvChad/starter" },
        "--lunarvim": { fn: installLunarVim, name: "LunarVim", repo: "https://github.com/LunarVim/LunarVim" },
      };

      const selected = Object.keys(installs).find((f) => flags.has(f));
      if (!selected) {
        console.log(chalk.bgRed.white.bold("\n ❌ Missing flag! \n"));
        console.log(chalk.yellowBright("Use one of: --fkvim, --lazyvim, --nvchad, --lunarvim"));
        console.log(chalk.gray("Try 'fkneo install --help' for details.\n"));
        return false;
      }

      const aliasIndex = args.indexOf("--alias");
      const customAlias = aliasIndex !== -1 && args[aliasIndex + 1] ? args[aliasIndex + 1] : null;

      const { fn, name, repo } = installs[selected];
      const alias = customAlias || name.toLowerCase();
      const targetDir = path.join(configDir, alias);

      // Confirm overwrite
      if (fs.existsSync(targetDir)) {
        const overwrite = await confirm({
          message: chalk.yellow(`⚠️ Directory ${targetDir} already exists. Overwrite?`),
          default: false,
        });
        if (!overwrite) {
          console.log(chalk.redBright("❌ Installation cancelled.\n"));
          return false;
        }
        fs.rmSync(targetDir, { recursive: true, force: true });
      }

      console.log(chalk.cyanBright(`\n🚀 Installing ${name} from ${repo}...\n`));
      const spinner = ora(`Installing ${name}...`).start();
      await fn(repo, targetDir, name, alias);
      spinner.succeed(chalk.greenBright(`${name} installed.`));

      addShellAlias(alias, alias, false);

      const setAsMain = flags.has("--main");
      const nvimDir = path.join(configDir, "nvim");

      if (setAsMain) {
        if (fs.existsSync(nvimDir)) fs.rmSync(nvimDir, { recursive: true, force: true });
        fs.symlinkSync(targetDir, nvimDir, "dir");
        console.log(chalk.greenBright(`\n⭐ ${name} set as your primary Neovim config!`));
        console.log(chalk.gray(`→ Symlinked ~/.config/nvim → ${targetDir}\n`));
      }

      writeMetadata({
        prebuilt: name,
        alias,
        targetDir,
        method: "git",
        installedAt: new Date().toISOString(),
        isMain: setAsMain,
      });

      console.log(chalk.bgGreen.black.bold(`\n ✅ ${name} installation complete! \n`));
      console.log(chalk.gray(`→ Location: ${targetDir}`));
      console.log(chalk.gray(`→ Launch: ${alias}\n`));
      return false;
    }

    // ---------------- CLEAN ----------------
    case "clean":
      console.log(chalk.yellowBright("\n🧹 Cleaning up...\n"));
      await runClean();
      console.log(chalk.greenBright("\n✅ Cleanup complete! Returning to FkNeo CLI...\n"));
      return false;

    // ---------------- RESET AUTH ----------------
    case "reset-auth":
      config.clear();
      console.log(chalk.yellowBright("🧹 Cleared saved GitHub credentials.\n"));
      return false;

    // ---------------- EXIT ----------------
    case "quit":
    case "exit":
      console.log(chalk.greenBright("\n👋 Goodbye!\n"));
      return true;

    // ---------------- DEFAULT ----------------
    default:
      console.log(chalk.bgRed.white.bold(`\n ❌ Unknown command: ${cmd} \n`));
      console.log(chalk.gray("Type 'help' to see available options.\n"));
      return false;
  }
}
