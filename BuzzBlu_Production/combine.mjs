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

const total = segments.reduce((a, s) => a + s.seconds, 0);
const joined = path.join(ROOT, "production", "temporary", "joined.mp4");
execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", list,
  "-c", "copy", "-movflags", "+faststart", joined], { stdio: "inherit" });

// A light music bed runs under the whole film. It is generated to the exact length and
// then side-chained against the film's own audio, so it lifts the quiet moments without
// ever competing with a voice, an impact or a reveal.
const music = path.join(ROOT, "production", "temporary", "film_music.wav");
console.log("Generating the music bed...");
execFileSync(process.env.PYTHON ?? "python3",
  [path.join(ROOT, "scripts", "film_music.py"), music, String(total)], { stdio: "inherit" });

const out = path.join(outDir, "BuzzBlu_Full_Reveal.mp4");
console.log("Mixing...");
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", joined, "-i", music, "-filter_complex",
  "[0:a]asplit=2[film][key];" +
  `[1:a]volume=${process.env.MUSIC_LEVEL ?? "0.17"}[bed];` +
  "[bed][key]sidechaincompress=threshold=0.02:ratio=9:attack=12:release=420:makeup=1[duck];" +
  "[film][duck]amix=inputs=2:duration=first:normalize=0," +
  // loudnorm works at 192 kHz, so come back to 48 kHz before limiting: limiting first
  // and resampling after lets the peaks climb again on the way down. The ceiling sits
  // below the target because the AAC encoder overshoots by roughly a decibel and a half
  // on dense material; 0.72 lands the delivered file at about -1.6 dBFS.
  "loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000,alimiter=limit=0.72:level=disabled[a]",
  "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-ar", "48000",
  "-movflags", "+faststart", out], { stdio: "inherit" });
fs.unlinkSync(joined);

const dur = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration",
  "-of", "csv=p=0", out]).toString().trim());
const expected = total;
const mm = Math.floor(dur / 60);
console.log(`${out}\n${dur.toFixed(2)}s (${mm}m ${(dur - mm * 60).toFixed(1)}s), expected ${expected}s`);
if (Math.abs(dur - expected) > 0.5) {
  console.error("duration does not match the running order");
  process.exit(1);
}
