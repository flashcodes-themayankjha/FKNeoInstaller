
// src/utils/format.js
import process from "process";

export const CLI_MARGIN = 4; // spaces from left edge

export function padLeft(text, spaces = CLI_MARGIN) {
  const pad = " ".repeat(spaces);
  return text
    .split("\n")
    .map((line) => (line.trim() ? pad + line : line))
    .join("\n");
}

export function centerText(text, width = process.stdout.columns) {
  const lines = text.split("\n");
  return lines
    .map((line) => {
      const pad = Math.floor((width - line.length) / 2);
      return " ".repeat(Math.max(0, pad)) + line;
    })
    .join("\n");
}
