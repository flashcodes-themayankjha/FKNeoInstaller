import fs from "fs";
import os from "os";
import path from "path";
import chalk from "chalk";
import { select, input } from "@inquirer/prompts";

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
export async function handleExistingConfig(aliasName, targetDir) {
  // if target does not exist, nothing to do
  if (!fs.existsSync(targetDir)) {
    return { aliasName, targetDir };
  }

  console.log(chalk.yellowBright(`⚠️  Config already exists at ${targetDir}`));

  const choice = await select({
    message: "Choose an action for the existing config:",
    choices: [
      { name: `Backup existing ${aliasName}`, value: "backup" },
      { name: `Remove existing ${aliasName}`, value: "remove" },
      { name: "Change alias name", value: "rename" },
    ],
  });

  if (choice === "backup") {
    const backupName = `${aliasName}-backup-${Date.now()}`;
    const backupPath = path.join(path.dirname(targetDir), backupName);
    fs.renameSync(targetDir, backupPath);
    console.log(chalk.green(`✔ Existing config backed up to ${backupPath}`));
    return { aliasName, targetDir };
  }

  if (choice === "remove") {
    fs.rmSync(targetDir, { recursive: true, force: true });
    console.log(chalk.green(`✔ Existing config removed.`));
    return { aliasName, targetDir };
  }

  // rename flow: prompt new alias and recursively ensure that one
  const newAlias = (
    await input({
      message: "Enter new alias name:",
      default: `${aliasName}-alt`,
    })
  ).trim();

  if (!newAlias) {
    // safety: if user returns empty, return original (shouldn't happen due to validation)
    return { aliasName, targetDir };
  }

  const newTarget = path.join(os.homedir(), ".config", newAlias);
  // recursively handle if new target exists. This recursion only occurs if new target exists,
  // and will eventually resolve (user must pick a non-conflicting name).
  return await handleExistingConfig(newAlias, newTarget);
}
