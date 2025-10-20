#!/usr/bin/env node
import { startBanner } from "../src/core/banner.js";
import { startRepl } from "../src/core/repl.js";
import { authenticateUser } from "../src/core/auth.js";
import * as config from "../src/utils/config.js";
import { handleCommand } from "../src/core/commands.js";
import chalk from "chalk";

(async () => {
  const args = process.argv.slice(2); // Get CLI args

  const username = config.getConfig("github.username");
  await startBanner(username);

  if (!username) {
    await authenticateUser();
  }

  // ✅ If no args → REPL mode
  if (args.length === 0) {
    await startRepl();
    return;
  }

  // ✅ If args provided → run directly as a command
  const cmd = args.join(" ");
  console.log(chalk.cyanBright(`\n⚙️  Running: fkneo ${cmd}\n`));

  const exit = await handleCommand(cmd);

  if (exit) {
    console.log(chalk.greenBright("\n👋 Goodbye!\n"));
    process.exit(0);
  } else {
    console.log(chalk.gray("\nReturning to REPL...\n"));
    await startRepl();
  }
})();
