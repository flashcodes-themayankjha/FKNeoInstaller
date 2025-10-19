
import { installPrebuilt } from '../core/installer.js';
import { select } from '@inquirer/prompts';
import { installGemini } from '../core/installer.js';
import chalk from 'chalk';

export async function installFkVim(repo, targetDir, name, choice) {
  let aiEnabled = false;
  const fkAiChoice = await select({
    message: chalk.yellowBright('Enable FkAi (Gemini CLI integration)?'),
    choices: [
      { name: 'Yes', value: true },
      { name: 'No', value: false },
    ],
  });
  if (fkAiChoice) {
    aiEnabled = await installGemini();
    if (!aiEnabled) console.log(chalk.red('⚠️ Gemini install failed — continuing without FkAi.'));
  }
  await installPrebuilt(repo, targetDir, name, choice);
  return aiEnabled;
}
