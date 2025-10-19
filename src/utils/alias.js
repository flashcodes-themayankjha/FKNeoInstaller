import fs from "fs";
import os from "os";
import path from "path";
import chalk from "chalk";

export function addShellAlias(aliasName, nvimAppName, isMain = false) {
  const shell = process.env.SHELL || "/bin/bash";
  const shellRC = shell.includes("zsh") ? ".zshrc" : ".bashrc";
  const rcPath = path.join(os.homedir(), shellRC);

  const aliasLines = [];

  aliasLines.push(`# FkNeo alias for ${aliasName}`);
  aliasLines.push(
    `alias ${aliasName}='NVIM_APPNAME="${nvimAppName}" nvim'`
  );

  const rcContent = fs.readFileSync(rcPath, "utf8");

  // Remove old alias if exists
  const newContent = rcContent
    .split("\n")
    .filter((line) => !line.includes(`alias ${aliasName}=`))
    .join("\n");

  fs.writeFileSync(rcPath, `${newContent}\n${aliasLines.join("\n")}\n`);
  console.log(chalk.green(`🔗 Alias '${aliasName}' added to ${rcPath}`));
}

