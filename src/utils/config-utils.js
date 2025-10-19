import fs from "fs";
import chalk from "chalk";
import { confirm } from "@inquirer/prompts";

export async function handleExistingConfig(aliasName, targetDir) {
  if (fs.existsSync(targetDir)) {
    console.log(chalk.yellow(`⚠️ Config '${aliasName}' already exists at ${targetDir}`));
    const shouldOverwrite = await confirm({
      message: "Do you want to overwrite this config?",
      default: false,
    });

    if (shouldOverwrite) {
      fs.rmSync(targetDir, { recursive: true, force: true });
      console.log(chalk.green(`🗑️ Removed existing directory: ${targetDir}`));
    } else {
      console.log(chalk.cyan("❎ Setup cancelled."));
      process.exit(0);
    }
  }
}

