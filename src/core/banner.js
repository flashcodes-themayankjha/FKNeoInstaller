import chalkAnimation from 'chalk-animation';
import chalk from 'chalk';

export async function startBanner() {
  console.clear();
  const art = `
███████╗██╗  ██╗███╗   ██╗███████╗ ██████╗     
██╔════╝██║ ██╔╝████╗  ██║██╔════╝██╔═══██╗    
█████╗  █████╔╝ ██╔██╗ ██║█████╗  ██║   ██║    
██╔══╝  ██╔═██╗ ██║╚██╗██║██╔══╝  ██║   ██║    
██║     ██║  ██╗██║ ╚████║███████╗╚██████╔╝    
╚═╝     ╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝ ╚═════╝                                                   
`;

  const tagline = chalk.blueBright(`\n  "Your dynamic Neovim setup wizard"\n`);

  const rainbow = chalkAnimation.rainbow(art);
  await new Promise(r => setTimeout(r, 2500)); // animation delay
  rainbow.stop();
  console.log(tagline);
}

