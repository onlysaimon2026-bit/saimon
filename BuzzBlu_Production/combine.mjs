// Join the 40 individual reveals into the full tournament film, in PDF order.
// Every clip is already 1920x1080/30 with the same codecs, so the streams are
// concatenated without re-encoding the picture; nothing is re-compressed twice.
//
//   node combine.mjs
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const players = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "players.json"), "utf8"));
const individual = path.join(ROOT, "output", "individual");
const outDir = path.join(ROOT, "output", "combined");
fs.mkdirSync(outDir, { recursive: true });

const clips = players.map((p) => {
  const file = path.join(individual, `${path.basename(p.photo, ".png")}.mp4`);
  if (!fs.existsSync(file)) throw new Error(`missing clip for ${p.name}: ${file}`);
  return file;
});
console.log(`Joining ${clips.length} clips in PDF order...`);

const list = path.join(ROOT, "production", "temporary", "concat.txt");
fs.mkdirSync(path.dirname(list), { recursive: true });
fs.writeFileSync(list, clips.map((f) => `file '${f}'`).join("\n"));

const out = path.join(outDir, "BuzzBlu_Full_Reveal.mp4");
execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", list,
  "-c", "copy", "-movflags", "+faststart", out], { stdio: "inherit" });

const dur = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration",
  "-of", "csv=p=0", out]).toString().trim());
const expected = clips.length * 10;
console.log(`${out}\n${dur.toFixed(2)}s (expected ${expected}s)`);
if (Math.abs(dur - expected) > 0.5) {
  console.error("duration does not match the expected total");
  process.exit(1);
}
