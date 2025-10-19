import fs from 'fs';
import os from 'os';
import path from 'path';
import chalk from 'chalk';

export function writeMetadata(newData) {
  const metaPath = path.join(os.homedir(), '.fkneo', 'meta.json');
  fs.mkdirSync(path.dirname(metaPath), { recursive: true });

  let meta = [];

  // If existing meta.json exists, read it safely
  if (fs.existsSync(metaPath)) {
    try {
      const fileContent = fs.readFileSync(metaPath, 'utf8').trim();
      if (fileContent.startsWith('[')) {
        meta = JSON.parse(fileContent);
      } else if (fileContent) {
        // If old format was a single object, wrap it into an array
        meta = [JSON.parse(fileContent)];
      }
    } catch (err) {
      console.log(chalk.red('⚠️ Failed to parse existing meta.json, recreating...'));
      meta = [];
    }
  }

  // If alias already exists, replace that entry
  const existingIndex = meta.findIndex(entry => entry.alias === newData.alias);
  if (existingIndex !== -1) {
    meta[existingIndex] = newData;
  } else {
    meta.push(newData);
  }

  // Write array back to file, pretty-printed
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');
}