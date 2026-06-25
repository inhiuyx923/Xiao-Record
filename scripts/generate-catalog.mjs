import { execFileSync } from "node:child_process";
import { readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const audioRoot = "小时候录音";
const outputFile = "audio-catalog.json";

function encodeUrl(filePath) {
  return filePath
    .split(path.sep)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function getDuration(filePath) {
  try {
    const output = execFileSync("afinfo", [filePath], { encoding: "utf8" });
    const match = output.match(/estimated duration:\s+([\d.]+)/i);
    return match ? Number(match[1]) : 0;
  } catch {
    return 0;
  }
}

function sizeLabel(bytes) {
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
}

const groups = readdirSync(audioRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort((a, b) => Number(a) - Number(b));

const catalog = groups.flatMap((group) => {
  const groupPath = path.join(audioRoot, group);
  return readdirSync(groupPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".mp3"))
    .map((entry) => {
      const filePath = path.join(groupPath, entry.name);
      const trackNumber = Number(entry.name.match(/\d+/)?.[0] || 0);
      const stats = statSync(filePath);
      return {
        id: `${group}-${entry.name.replace(/\.mp3$/i, "")}`,
        group,
        name: entry.name,
        trackNumber,
        duration: Math.round(getDuration(filePath) * 100) / 100,
        size: stats.size,
        sizeLabel: sizeLabel(stats.size),
        url: encodeUrl(filePath),
      };
    })
    .sort((a, b) => a.trackNumber - b.trackNumber);
});

writeFileSync(outputFile, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`Generated ${outputFile} with ${catalog.length} tracks.`);
