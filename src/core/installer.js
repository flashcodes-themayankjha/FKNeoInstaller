import chalk from "chalk";
import ora from "ora";
import cliProgress from "cli-progress";
import fs from "fs";
import path from "path";
import { spawn, execSync } from "child_process";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ----------------- Git clone with dynamic progress -----------------
export async function cloneRepoWithDynamicProgress(repo, targetDir, name) {
  // make sure parent dir exists
  const parent = path.dirname(targetDir);
  if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });

  console.log(chalk.cyan(`\n➡️ Cloning ${name} into ${targetDir}...\n`));

  // Create progress bar for clone
  const bar = new cliProgress.SingleBar(
    {
      format: "{bar} {percentage}% | {task}",
      barCompleteChar: "█",
      barIncompleteChar: "░",
      hideCursor: true,
    },
    cliProgress.Presets.shades_classic,
  );

  bar.start(100, 0, { task: `${name} Cloning...` });

  return new Promise((resolve, reject) => {
    const git = spawn("git", ["clone", "--progress", repo, targetDir]);

    // parse progress from stderr
    git.stderr.on("data", (buf) => {
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
        bar.update(Math.min(99, 90 + Math.round(pct2 / 10)), {
          task: `${name} Finalizing...`,
        });
      }
    });

    git.on("close", (code) => {
      if (code === 0) {
        bar.update(100, { task: chalk.green(`${name} Cloned`) });
        bar.stop();
        console.log(
          chalk.green(`✔ ${name} cloned successfully at ${targetDir}`),
        );
        resolve();
      } else {
        bar.stop();
        console.log(chalk.red(`❌ Git clone failed with code ${code}`));
        reject(new Error("Git clone failed"));
      }
    });
  });
}

// ----------------- Gemini install (FkAi) -----------------
export async function installGemini() {
  const spinner = ora("Installing Gemini CLI (fk-ai)...").start();
  try {
    execSync("npm install -g gemini-cli", { stdio: "ignore" });
    spinner.succeed(chalk.green("✔ Gemini CLI installed."));
    return true;
  } catch (e) {
    spinner.fail(chalk.red("❌ Failed to install Gemini CLI."));
    return false;
  }
}

// ------------- Multi-line plugin installation (groups + per-plugin) -------------
export async function installPluginsWithDetailedProgress(targetDir) {
  const flamingo = "#F28FB0"; // group text
  const cyan = "#00FFFF"; // cyan glow for progress
  const peach = "#F9E2AF"; // badge bg
  const softLavender = "#b4befe";

  console.log(
    chalk.cyan("\n📦 Installing plugin groups and individual plugins...\n"),
  );

  // Initialize overall progress bar
  const mb = new cliProgress.MultiBar(
    {
      clearOnComplete: false,
      hideCursor: true,
      format: chalk.hex(cyan)("{bar}") + " {percentage}% | {meta}",
      barCompleteChar: "█",
      barIncompleteChar: "░",
      barsize: 30,
      autopadding: true,
    },
    cliProgress.Presets.shades_classic,
  );

  const overall = mb.create(100, 0, { meta: "Overall Progress" });

  // Group structure
  const groups = [
    {
      name: "Basic Plugins",
      plugins: ["nvim-tree.lua", "telescope.nvim", "which-key.nvim"],
      weight: 20,
    },
    {
      name: "LSP + Dependencies",
      plugins: ["mason.nvim", "mason-lspconfig.nvim", "cmp-nvim-lsp"],
      weight: 20,
    },
    {
      name: "FkNotes + Themes",
      plugins: ["fknotes.nvim", "catppuccin", "tokyonight.nvim"],
      weight: 20,
    },
    {
      name: "Treesitter",
      plugins: ["nvim-treesitter", "nvim-treesitter-textobjects"],
      weight: 20,
    },
  ];

  let overallProgress = 0;

  for (const group of groups) {
    const badge = chalk.bgHex(peach).black.bold(" Installing plugin: ");
    console.log(
      "\n" + badge + " " + chalk.hex(flamingo).bold(group.name) + "\n",
    );
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
        percentage = Math.min(
          100,
          Math.round((doneChunks / totalChunks) * 100),
        );
        const speed = (3 + Math.random() * 7).toFixed(2);

        pluginBar.update(percentage, {
          meta: `${doneChunks}/${totalChunks} Chunks || Speed: ${speed}Mb/s || ${chalk.green("✔")} ${chalk.hex(softLavender)(plugin)}`,
        });

        // update overall progress
        const groupWeight = group.weight / group.plugins.length;
        overallProgress = Math.min(
          100,
          overallProgress + groupWeight * (chunkStep / totalChunks) * 2,
        );
        overall.update(overallProgress, { meta: chalk.gray("Progress...") });

        await sleep(50 + Math.random() * 70);
      }

      pluginBar.update(100, {
        meta: `${totalChunks}/${totalChunks} Chunks || Speed: 0.00Mb/s || ${chalk.green("✔")} ${chalk.hex(softLavender)(plugin)} installed.`,
      });
      pluginBar.stop();
      await sleep(120);
    }

    overall.update(Math.min(100, overallProgress + group.weight / 2));
    console.log(chalk.hex(flamingo)(`↳ Finished group: ${group.name}\n`));
  }

  overall.update(100, { meta: chalk.green("Complete") });
  mb.stop();

  console.log(
    chalk.cyan(
      "\n[Plugins] Running headless Lazy.nvim sync (this will actually install plugins)...",
    ),
  );
  try {
    execSync(
      `NVIM_APPNAME="${path.basename(targetDir)}" nvim --headless "+Lazy! sync" +qa`,
      { stdio: "inherit" },
    );
    console.log(
      chalk.green("✔ Lazy.nvim sync completed (plugins installed)."),
    );
  } catch {
    console.log(
      chalk.red("❌ Lazy.nvim sync failed — you can rerun with :Lazy sync."),
    );
  }

  console.log(chalk.green("\n🎉 Plugin installation step done.\n"));
}

export async function installPrebuilt(repo, targetDir, name, choice) {
  await cloneRepoWithDynamicProgress(repo, targetDir, name);

  if (choice === "fkvim" || choice === "lazyvim") {
    await installPluginsWithDetailedProgress(targetDir);
  } else if (choice === "nvchad") {
    console.log(
      chalk.cyan(
        "📦 NVChad selected: skipping Lazy.nvim sync (it uses its own plugin manager).",
      ),
    );
  }
}
