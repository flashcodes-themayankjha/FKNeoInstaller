import axios from 'axios';
import { input } from '@inquirer/prompts';
import chalk from 'chalk';
import ora from 'ora';

export async function authenticateUser() {
  console.log(chalk.cyan('\n🔑 GitHub Authentication Required\n'));

  const username = await input({ message: 'Enter your GitHub username:' });

  const repoOwner = 'FkNotes';
  const repoName = 'FkVim';
  const url = `https://api.github.com/users/${username}/starred/${repoOwner}/${repoName}`;
  const spinner = ora('Checking your star status...').start();

  try {
    const res = await axios.get(url, {
      headers: { 'User-Agent': 'FkNeoCLI' },
      validateStatus: () => true,
    });

    spinner.stop();

    if (res.status === 204) {
      console.log(chalk.green('✅ Thank you for supporting the project! ❤️\n'));
    } else {
      console.log(chalk.yellow('⚠️  You haven’t starred the repo yet!'));
      console.log(chalk.gray(`Please star https://github.com/${repoOwner}/${repoName} and restart.`));
      process.exit(1);
    }
  } catch (err) {
    spinner.stop();
    console.error(chalk.red('❌ Error checking GitHub API:'), err.message);
    process.exit(1);
  }
}
