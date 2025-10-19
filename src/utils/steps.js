import chalk from "chalk";

export async function showStep(current, total, title) {
  console.log(
    chalk.bgYellow.black.bold(` [Step ${current}/${total}] `) +
      chalk.cyanBright(` ${title}\n`),
  );
}
