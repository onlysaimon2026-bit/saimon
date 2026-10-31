// Join every rendered segment into the full tournament film, in the PDF's own order:
// leaders, then the icon round, then each position category and its players.
// All clips share the same codecs and format, so the streams are concatenated without
// re-encoding; nothing is compressed twice.
//
//   node combine.mjs
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const { segments } = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "segments.json"), "utf8"));
const individual = path.join(ROOT, "output", "individual");
const outDir = path.join(ROOT, "output", "combined");
fs.mkdirSync(outDir, { recursive: true });

const missing = segments.filter((s) => !fs.existsSync(path.join(individual, `${s.id}.mp4`)));
if (missing.length) {
  console.error(`missing ${missing.length} clip(s): ${missing.slice(0, 5).map((s) => s.id).join(", ")}`);
  process.exit(1);
}
console.log(`Joining ${segments.length} segments in PDF order...`);

const list = path.join(ROOT, "production", "temporary", "concat.txt");
fs.mkdirSync(path.dirname(list), { recursive: true });
fs.writeFileSync(list, segments.map((s) => `file '${path.join(individual, `${s.id}.mp4`)}'`).join("\n"));

const out = path.join(outDir, "BuzzBlu_Full_Reveal.mp4");
execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", list,
  "-c", "copy", "-movflags", "+faststart", out], { stdio: "inherit" });

const dur = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration",
  "-of", "csv=p=0", out]).toString().trim());
const expected = segments.reduce((a, s) => a + s.seconds, 0);
const mm = Math.floor(dur / 60);
console.log(`${out}\n${dur.toFixed(2)}s (${mm}m ${(dur - mm * 60).toFixed(1)}s), expected ${expected}s`);
if (Math.abs(dur - expected) > 0.5) {
  console.error("duration does not match the running order");
  process.exit(1);
}
