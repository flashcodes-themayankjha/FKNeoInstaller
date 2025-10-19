import fs from "fs";
import os from "os";
import path from "path";

export function writeMetadata(entry) {
  const fkneoDir = path.join(os.homedir(), ".fkneo");
  const metaPath = path.join(fkneoDir, "meta.json");

  if (!fs.existsSync(fkneoDir)) fs.mkdirSync(fkneoDir, { recursive: true });

  let metaData = [];
  if (fs.existsSync(metaPath)) {
    try {
      const raw = fs.readFileSync(metaPath, "utf8");
      metaData = JSON.parse(raw || "[]");
    } catch {
      metaData = [];
    }
  }

  metaData.push({
    prebuilt: entry.config,
    main: entry.main,
    alias: entry.alias,
    targetDir: entry.location,
    aiEnabled: entry.aiEnabled,
    method: entry.method,
    installedAt: new Date().toISOString(),
  });

  fs.writeFileSync(metaPath, JSON.stringify(metaData, null, 2));
  console.log(`💾 Metadata updated at ${metaPath}`);
}

