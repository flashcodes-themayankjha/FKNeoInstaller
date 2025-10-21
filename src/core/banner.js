
import chalkAnimation from "chalk-animation";
import chalk from "chalk";
import boxen from "boxen";
import fs from "fs";
import path from "path";
import { padLeft } from "../utils/format.js";

export async function startBanner(username) {
  // 1️⃣ ASCII Art (with left padding)
  const art = `
███████╗██╗  ██╗███╗   ██╗███████╗ ██████╗     
██╔════╝██║ ██╔╝████╗  ██║██╔════╝██╔═══██╗    
█████╗  █████╔╝ ██╔██╗ ██║█████╗  ██║   ██║    
██╔══╝  ██╔═██╗ ██║╚██╗██║██╔══╝  ██║   ██║    
██║     ██║  ██╗██║ ╚████║███████╗╚██████╔╝    
╚═╝     ╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝ ╚═════╝
`;

  const fkneoArt = padLeft(art);
  const rainbow = chalkAnimation.rainbow(fkneoArt);
  await new Promise((r) => setTimeout(r, 2000));
  rainbow.stop();

  const tagline = chalk.blueBright(`"Empower your Neovim like never before"\n`);
  console.log(padLeft(tagline));

  // 2️⃣ Read package.json for version
  const packageJsonPath = path.resolve(
    path.dirname(import.meta.url.replace("file://", "")),
    "../../package.json"
  );

  let version = "v0.0.0";
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    version = `v${packageJson.version}`;
  } catch {
    console.error(padLeft(chalk.redBright("🚧 Could not read package.json for version.")));
  }

  // 3️⃣ Info box (also padded)
  const infoBox = boxen("Your dynamic Neovim setup wizard", {
    title: `FkNeoInstaller  ${version}`,
    padding: 1,
    borderStyle: "round",
    borderColor: "magenta",
    titleAlignment: "center",
  });

  console.log(padLeft(infoBox));

  // 4️⃣ Username banner (no left padding)
  if (username) {
    console.log(
      "\n" +
        chalk.bgYellow.black.bold(" 👤 Logged in as : ") +
        " " +
        chalk.greenBright.bold(username) +
        "\n"
    );
  }
}
