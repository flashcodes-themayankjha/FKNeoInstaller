import axios from "axios";
import { input, password } from "@inquirer/prompts";
import select from "@inquirer/select";
import chalk from "chalk";
import ora from "ora";
import boxen from "boxen";
import Conf from "conf";
import open from "open";

const config = new Conf({ projectName: "fkneo-cli" });

/**
 * Authenticate GitHub user without killing the CLI.
 * Returns:
 *   { success: true } → user authenticated
 *   { success: false, reason: 'quit' } → user chose to quit
 *   { success: false, reason: 'error', message } → API or network error
 */
export async function authenticateUser() {
  let username = config.get("github.username");
  let token = config.get("github.token");

  if (username && token) {
    return { success: true };
  }

  console.log(
    boxen(chalk.cyanBright("🔑 GitHub Authentication Required"), {
      padding: 1,
      margin: { top: 0, bottom: 1 },
      borderStyle: "round",
      borderColor: "cyan",
    }),
  );

  // 🔹 Username
  if (!username) {
    username = await input({
      message: chalk.yellowBright("Enter your GitHub username:"),
    });
    config.set("github.username", username);
  } else {
    console.log(
      boxen(chalk.greenBright(`Using stored username: ${username}`), {
        padding: 1,
        margin: { top: 0, bottom: 1 },
        borderStyle: "round",
        borderColor: "green",
      }),
    );
  }

  // 🔹 Token
  if (!token) {
    token = await password({
      message: chalk.yellowBright(
        "Enter your GitHub Personal Access Token (read:user, public_repo):",
      ),
    });
    config.set("github.token", token);

    console.log(
      boxen(
        chalk.blueBright("🔐 GitHub token saved securely for future sessions."),
        {
          padding: 1,
          margin: { top: 0, bottom: 1 },
          borderStyle: "round",
          borderColor: "blue",
        },
      ),
    );
  }

  const repoOwner = "flashcodes-themayankjha";
  const repoName = "fkneo-cli";
  const repoUrl = `https://github.com/${repoOwner}/${repoName}`;
  const starCheckUrl = `https://api.github.com/user/starred/${repoOwner}/${repoName}`;

  const spinner = ora("Checking your star status...").start();

  try {
    const res = await axios.get(starCheckUrl, {
      headers: {
        "User-Agent": "FkNeoCLI",
        Authorization: `token ${token}`,
      },
      validateStatus: () => true,
    });

    spinner.stop();

    if (res.status === 204) {
      console.log(
        boxen(
          chalk.greenBright("✅ Thank you for supporting the project! ❤️"),
          {
            padding: 1,
            margin: { top: 1, bottom: 1 },
            borderStyle: "round",
            borderColor: "green",
          },
        ),
      );
      return { success: true };
    }

    if (res.status === 404) {
      console.log(
        boxen(chalk.yellowBright("⚠️  You haven’t starred the repo yet!"), {
          padding: 1,
          margin: { top: 1, bottom: 1 },
          borderStyle: "round",
          borderColor: "yellow",
        }),
      );
      console.log(chalk.cyanBright(`👉 ${repoUrl}\n`));

      while (true) {
        const choice = await select({
          message: chalk.magentaBright("What would you like to do?"),
          choices: [
            { name: "⭐ Open the repo and star it", value: "open" },
            { name: "🔁 Retry authentication", value: "retry" },
            { name: "❌ Quit setup", value: "quit" },
          ],
        });

        if (choice === "open") {
          await open(repoUrl);
          console.log(
            boxen(
              chalk.cyanBright(
                '🌐 Opened the repo in your browser. Star it, then choose "Retry".',
              ),
              {
                padding: 1,
                margin: { top: 1, bottom: 1 },
                borderStyle: "round",
                borderColor: "cyan",
              },
            ),
          );
        } else if (choice === "retry") {
          return await authenticateUser();
        } else if (choice === "quit") {
          console.log(
            boxen(chalk.redBright("👋 Exiting setup (user canceled)."), {
              padding: 1,
              margin: { top: 1, bottom: 1 },
              borderStyle: "round",
              borderColor: "red",
            }),
          );
          return { success: false, reason: "quit" };
        }
      }
    }

    console.log(
      boxen(chalk.redBright(`Unexpected response: ${res.status}`), {
        padding: 1,
        margin: { top: 1, bottom: 1 },
        borderStyle: "round",
        borderColor: "red",
      }),
    );

    return {
      success: false,
      reason: "error",
      message: `Unexpected status ${res.status}`,
    };
  } catch (err) {
    spinner.stop();
    return { success: false, reason: "error", message: err.message };
  }
}
