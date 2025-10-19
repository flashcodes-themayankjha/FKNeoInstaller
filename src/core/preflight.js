import chalk from "chalk";
import ora from "ora";
import fs from "fs";
import os from "os";
import path from "path";
import { execSync } from "child_process";
import open from "open";
import { confirm } from "@inquirer/prompts";

// ------------------------- NEW: Preflight Checks -------------------------
export async function checkNeovimInstalled() {
  try {
    execSync("nvim --version", { stdio: "ignore" });
    console.log(chalk.green("✅ Neovim detected."));
    return { success: true };
  } catch {
    console.log(chalk.red("\n❌ Neovim not found on your system."));
    const install = await confirm({
      message: chalk.yellow("Would you like to install Neovim now?"),
      default: true,
    });

    if (!install) {
      console.log(chalk.red("⚠️ Neovim is required to continue setup."));
      return { success: false, reason: "not-installed" };
    }

    const spinner = ora("Installing Neovim...").start();
    try {
      const platform = os.platform();
      if (platform === "darwin") {
        execSync("brew install neovim", { stdio: "ignore" });
      } else if (platform === "linux") {
        execSync("sudo apt-get update && sudo apt-get install -y neovim", {
          stdio: "ignore",
        });
      } else if (platform === "win32") {
        spinner.stop();
        console.log(
          chalk.cyan(
            "⚠️ Please manually install Neovim from: https://neovim.io/",
          ),
        );
        await open("https://neovim.io/");
        return { success: false, reason: "manual-install" };
      } else {
        spinner.stop();
        console.log(
          chalk.cyan("⚠️ Unknown OS. Please install Neovim manually."),
        );
        await open("https://neovim.io/");
        return { success: false, reason: "unknown-os" };
      }

      spinner.succeed(chalk.green("✔ Neovim installed successfully."));
      return { success: true };
    } catch (err) {
      spinner.fail(chalk.red("❌ Failed to install Neovim automatically."));
      console.log(
        chalk.cyan(
          "Please install Neovim manually from https://neovim.io/download.",
        ),
      );
      await open("https://neovim.io/download");
      return { success: false, reason: "install-failed", message: err.message };
    }
  }
}

// ------------------------- Font Detection -------------------------
function getFontDirs() {
  const dirs = [];
  const platform = os.platform();

  if (platform === "darwin") {
    dirs.push(path.join(os.homedir(), "Library/Fonts"));
    dirs.push("/Library/Fonts");
  } else if (platform === "win32") {
    dirs.push(path.join(process.env.WINDIR || "C:\\Windows", "Fonts"));
  } else {
    dirs.push(path.join(os.homedir(), ".local", "share", "fonts"));
    dirs.push("/usr/share/fonts");
    dirs.push("/usr/local/share/fonts");
  }

  return dirs.filter(fs.existsSync);
}

// Clean up weird Unicode or invisible characters from filenames
function sanitizeFontName(name) {
  return name
    .replace(/[^\x20-\x7E]/g, "") // strip non-ASCII chars
    .replace(/\s+/g, " ") // normalize spaces
    .trim()
    .toLowerCase();
}

// Detect if any Nerd Font exists
export async function checkNerdFontInstalled() {
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
    const hasNerdFont = normalized.some(
      (f) =>
        (f.includes("nerd") || f.includes(" nf")) &&
        (f.endsWith(".ttf") || f.endsWith(".otf") || f.endsWith(".ttc")),
    );

    if (hasNerdFont) {
      console.log(chalk.green("✅ Nerd Font detected."));
      return { success: true };
    }

    console.log(chalk.yellow("\n⚠️ No Nerd Font detected on your system."));
    const openFonts = await confirm({
      message: chalk.yellow(
        "Would you like to open the Nerd Fonts website to install one (e.g. MesloLGS NF)?",
      ),
      default: true,
    });

    if (openFonts) {
      console.log(chalk.cyan("🌐 Opening https://www.nerdfonts.com/#home ..."));
      await open("https://www.nerdfonts.com/#home");
    }

    console.log(
      chalk.gray(
        "\nTip: Install “MesloLGS NF” for best results (used by Oh My Zsh, Starship, etc.)",
      ),
    );
    return { success: false, reason: "not-found" };
  } catch (err) {
    console.log(
      chalk.red("⚠️ Could not check fonts automatically:"),
      err.message,
    );
    console.log(chalk.cyan("🌐 Opening https://www.nerdfonts.com/#home ..."));
    await open("https://www.nerdfonts.com/#home");
    return { success: false, reason: "error", message: err.message };
  }
}
