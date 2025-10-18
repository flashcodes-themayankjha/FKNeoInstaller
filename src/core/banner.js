
import chalkAnimation from 'chalk-animation';
import chalk from 'chalk';
import boxen from 'boxen';
import fs from 'fs';
import path from 'path';

export async function startBanner(username) {
  

  // 1️⃣ ASCII Art (no box)
  const art = `
███████╗██╗  ██╗███╗   ██╗███████╗ ██████╗     
██╔════╝██║ ██╔╝████╗  ██║██╔════╝██╔═══██╗    
█████╗  █████╔╝ ██╔██╗ ██║█████╗  ██║   ██║    
██╔══╝  ██╔═██╗ ██║╚██╗██║██╔══╝  ██║   ██║    
██║     ██║  ██╗██║ ╚████║███████╗╚██████╔╝    
╚═╝     ╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝ ╚═════╝
`;

  const rainbow = chalkAnimation.rainbow(art);
  await new Promise(r => setTimeout(r, 2000));
  rainbow.stop();

  const tagline = chalk.blueBright(`"Empower your Neovim like never before"\n`);

  console.log(tagline);

  // 2️⃣ Dynamic info box: version and tagline
  const packageJsonPath = path.resolve(process.cwd(), 'package.json');
  let version = 'v0.0.0';
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    version = `v${packageJson.version}`;
  } catch (err) {
    console.error(chalk.redBright('🚧 Could not read package.json for version.'));
  }

  const infoBox = boxen('Your dynamic Neovim setup wizard', {
    title: `FkNeo CLI ${version}`,
    padding: 1,
    borderStyle: 'round',
    borderColor: 'magenta',
    titleAlignment: 'center',
  });

  console.log(infoBox);

 if (username) {
  console.log(`${chalk.bgYellow.black(' 👤 Logged: ')} ${chalk.greenBright(username)}`);
}

}
