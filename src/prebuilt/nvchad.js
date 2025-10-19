import { installPrebuilt } from "../core/installer.js";

export async function installNvChad(repo, targetDir, name, choice) {
  await installPrebuilt(repo, targetDir, name, choice);
}
