
import chalk from "chalk";
import Conf from "conf";
import os from "os";
import path from "path";
import fs from "fs";
import { runSetup } from "./setup.js";
import { runClean } from "./clean.js";
import { runGenerator } from "./fkneo-generator.js";
import { installFkVim } from "../prebuilt/fkvim.js";
import { installLazyVim } from "../prebuilt/lazyvim.js";
import { installNvChad } from "../prebuilt/nvchad.js";
import { installLunarVim } from "../prebuilt/lunarvim.js";
import { addShellAlias } from "../utils/alias.js";
import { writeMetadata } from "../utils/meta.js";
import { confirm } from "@inquirer/prompts";
import ora from "ora";

const config = new Conf({ projectName: "fkneo-cli" });

export async function handleCommand(cmd) {
  const input = cmd.trim().toLowerCase();
  const [command, ...args] = input.split(/\s+/);
  const flags = new Set(args);

  switch (command) {
    // ---------------- HELP ----------------
    case "help": {
      const section = (title) =>
        chalk.bgYellow.black.bold(` ${title.toUpperCase()} `);

      const usage = `
${section("⚙️ USAGE")}

  ${chalk.cyanBright("$ fkneo-cli")} ${chalk.white("<command> [option]")}
`;

      const commands = `
${section("⌘ COMMANDS")}

  ${chalk.greenBright("help").padEnd(15)} Print help info
  ${chalk.greenBright("setup").padEnd(15)} Start Neovim configuration setup
  ${chalk.greenBright("install").padEnd(15)} Quick install of a Neovim config
  ${chalk.greenBright("generate").padEnd(15)} Create a custom Neovim setup
  ${chalk.greenBright("clean").padEnd(15)} Remove prebuilt configs and aliases
  ${chalk.greenBright("reset-auth").padEnd(15)} Clear saved GitHub credentials
  ${chalk.greenBright("quit").padEnd(15)} Exit the CLI
  ${chalk.greenBright("exit").padEnd(15)} Same as quit
`;

      const options = `
${section("🛠️ INSTALL FLAGS")}

  ${chalk.yellowBright("--fkvim").padEnd(20)} Install FkVim
  ${chalk.yellowBright("--lazyvim").padEnd(20)} Install LazyVim
  ${chalk.yellowBright("--nvchad").padEnd(20)} Install NvChad
  ${chalk.yellowBright("--lunarvim").padEnd(20)} Install LunarVim
  ${chalk.yellowBright("--alias <name>").padEnd(20)} Use a custom CLI alias
  ${chalk.yellowBright("--main").padEnd(20)} Set this config as main (~/.config/nvim)
`;

      console.log(`${usage}${commands}${options}`);
      return false;
    }

    // ---------------- SETUP ----------------
    case "setup":
      console.log(chalk.cyanBright("\n🚀 Launching setup wizard...\n"));
      await runSetup();
      console.log(
        chalk.greenBright("\n✅ Setup complete! Returning to FkNeo CLI...\n"),
      );
      return false;

    // ---------------- GENERATOR ----------------
    case "generate":
      console.log(chalk.cyanBright("\n🧩 Starting custom generator...\n"));
      await runGenerator();
      console.log(
        chalk.greenBright(
          "\n✅ Generation complete! Returning to FkNeo CLI...\n",
        ),
      );
      return false;

    // ---------------- INSTALL ----------------
    case "install": {
      console.log(chalk.bgYellow.black.bold("\n  ⚙️  Quick Install Mode  \n"));

      const home = os.homedir();
      const configDir = path.join(home, ".config");

      const installs = {
        "--fkvim": {
          fn: installFkVim,
          name: "FkVim",
          repo: "https://github.com/TheFlashCodes/FKvim",
        },
        "--lazyvim": {
          fn: installLazyVim,
          name: "LazyVim",
          repo: "https://github.com/LazyVim/starter",
        },
        "--nvchad": {
          fn: installNvChad,
          name: "NvChad",
          repo: "https://github.com/NvChad/starter",
        },
        "--lunarvim": {
          fn: installLunarVim,
          name: "LunarVim",
          repo: "https://github.com/LunarVim/LunarVim",
        },
      };

      // Identify which preset to install
      const selected = Object.keys(installs).find((f) => flags.has(f));
      if (!selected) {
        console.log(
          chalk.redBright(
            "❌ Please specify a preset flag (e.g., --fkvim, --lazyvim, --nvchad, --lunarvim)\n",
          ),
        );
        return false;
      }

      // Extract custom alias (if any)
      const aliasIndex = args.indexOf("--alias");
      const customAlias =
        aliasIndex !== -1 && args[aliasIndex + 1]
          ? args[aliasIndex + 1]
          : null;

      const { fn, name, repo } = installs[selected];
      const alias = customAlias || name.toLowerCase();
      const targetDir = path.join(configDir, alias);

      // Check existing directory
      if (fs.existsSync(targetDir)) {
        const overwrite = await confirm({
          message: chalk.yellow(
            `⚠️ Directory ${targetDir} already exists. Overwrite?`,
          ),
          default: false,
        });
        if (!overwrite) {
          console.log(chalk.redBright("❌ Installation aborted."));
          return false;
        }
        fs.rmSync(targetDir, { recursive: true, force: true });
      }

      console.log(chalk.cyanBright(`\n🚀 Installing ${name} from ${repo}...\n`));
      const spinner = ora(`Installing ${name}...`).start();
      await fn(repo, targetDir, name, alias);
      spinner.succeed(chalk.greenBright(`${name} installed.`));

      // Create alias
      addShellAlias(alias, alias, false);

      // Handle --main flag (make it primary nvim config)
      const setAsMain = flags.has("--main");
      const nvimDir = path.join(configDir, "nvim");

      if (setAsMain) {
        if (fs.existsSync(nvimDir)) {
          fs.rmSync(nvimDir, { recursive: true, force: true });
        }
        fs.symlinkSync(targetDir, nvimDir, "dir");
        console.log(
          chalk.greenBright(`\n⭐ ${name} is now your primary Neovim config!`),
        );
        console.log(chalk.gray(`→ Symlinked ~/.config/nvim → ${targetDir}\n`));
      }

      // Metadata
      writeMetadata({
        prebuilt: name,
        alias,
        targetDir,
        method: "git",
        installedAt: new Date().toISOString(),
        isMain: setAsMain,
      });

      console.log(chalk.greenBright(`\n✅ ${name} installed successfully!`));
      console.log(chalk.gray(`→ Location: ${targetDir}`));
      console.log(chalk.gray(`→ Launch: ${alias}\n`));
      return false;
    }

    // ---------------- CLEAN ----------------
    case "clean":
      console.log(chalk.yellowBright("\n🧹 Starting cleanup...\n"));
      await runClean();
      console.log(
        chalk.greenBright("\n✅ Cleanup complete! Returning to FkNeo CLI...\n"),
      );
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
      console.log(
        chalk.redBright(
          '❌ Unknown command. Type "help" to see available options.\n',
        ),
      );
      return false;
  }
}
