import chalk from "chalk";
import Conf from "conf";
import { runSetup } from "./setup.js";
import { runClean } from "./clean.js";
import { runGenerator } from "./fkneo-generator.js";

const config = new Conf({ projectName: "fkneo-cli" });

export async function handleCommand(cmd) {
  const input = cmd.trim().toLowerCase();

  switch (input) {
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
  ${chalk.greenBright("generate").padEnd(15)} Create a custom Neovim setup
  ${chalk.greenBright("clean").padEnd(15)} Remove prebuilt configs, aliases, and restore backups
  ${chalk.greenBright("reset-auth").padEnd(15)} Clear saved GitHub credentials
  ${chalk.greenBright("quit").padEnd(15)} Exit the CLI
  ${chalk.greenBright("exit").padEnd(15)} Same as quit
`;

      const options = `
${section("🛠️ OPTIONS")}

  ${chalk.yellowBright("-r, --reset").padEnd(20)} Clear saved GitHub credentials
  ${chalk.yellowBright("-q, --quit").padEnd(20)} Quit the CLI
  ${chalk.yellowBright("-d, --debug").padEnd(20)} Print debug info
  ${chalk.yellowBright("-t, --test").padEnd(20)} Enable test mode
`;

      console.log(`${usage}${commands}${options}`);
      return false;
    }

    case "setup":
      console.log(chalk.cyanBright("\n🚀 Launching setup wizard...\n"));
      await runSetup();
      console.log(
        chalk.greenBright("\n✅ Setup complete! Returning to FkNeo CLI...\n"),
      );
      return false;

    case "generate":
      console.log(chalk.cyanBright("\n🧩 Starting custom generator...\n"));
      await runGenerator();
      console.log(
        chalk.greenBright(
          "\n✅ Generation complete! Returning to FkNeo CLI...\n",
        ),
      );
      return false;

    case "clean":
      console.log(chalk.yellowBright("\n🧹 Starting cleanup...\n"));
      await runClean();
      console.log(
        chalk.greenBright("\n✅ Cleanup complete! Returning to FkNeo CLI...\n"),
      );
      return false;

    case "reset-auth":
      config.clear();
      console.log(chalk.yellowBright("🧹 Cleared saved GitHub credentials.\n"));
      return false;

    case "quit":
    case "exit":
      console.log(chalk.greenBright("\n👋 Goodbye!\n"));
      return true;

    default:
      console.log(
        chalk.redBright(
          '❌ Unknown command. Type "help" to see available options.\n',
        ),
      );
      return false;
  }
}
