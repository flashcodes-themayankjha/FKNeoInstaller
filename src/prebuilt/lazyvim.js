import { installPrebuilt } from "../core/installer.js";

export async function installLazyVim(repo, targetDir, name, choice) {
  await installPrebuilt(repo, targetDir, name, choice);
}
