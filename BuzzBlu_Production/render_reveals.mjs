// BuzzBlu reveal renderer.
//
//   node render_reveals.mjs                 render all 40 players
//   node render_reveals.mjs --only saimon   render one player (name fragment or sequence)
//   node render_reveals.mjs --from 10 --to 20
//
// The composition renders picture only; the matching sound bed is muxed on afterwards
// and loudness-normalised, which keeps every clip at the same level and keeps the
// audio exactly in sync with the fixed 10-second timeline.
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const PUBLIC = path.join(ROOT, "public");
const OUT = path.join(ROOT, "output", "individual");
const TMP = path.join(ROOT, "production", "temporary");
const LOGS = path.join(ROOT, "production", "logs");
const BROWSER =
  process.env.REMOTION_CHROME ?? "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";

const arg = (flag) => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? null : process.argv[i + 1];
};

const players = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "players.json"), "utf8"));
let chosen = players;
const only = arg("--only");
if (only) {
  const key = only.toLowerCase();
  chosen = players.filter((p) => String(p.sequence) === key || p.name.toLowerCase().includes(key));
  if (!chosen.length) throw new Error(`no player matches "${only}"`);
}
const from = Number(arg("--from") ?? 1);
const to = Number(arg("--to") ?? 40);
chosen = chosen.filter((p) => p.sequence >= from && p.sequence <= to);

for (const dir of [OUT, TMP, LOGS]) fs.mkdirSync(dir, { recursive: true });

console.log(`Bundling engine for ${chosen.length} player(s)...`);
const serveUrl = await bundle({ entryPoint: path.join(ROOT, "engine", "index.ts"), publicDir: PUBLIC });

const slug = (p) => path.basename(p.photo, ".png");
const log = [];
for (const [i, p] of chosen.entries()) {
  const started = Date.now();
  const name = slug(p);
  const silent = path.join(TMP, `${name}.mp4`);
  const final = path.join(OUT, `${name}.mp4`);
  const inputProps = {
    player: {
      sequence: p.sequence,
      name: p.name,
      position: p.position,
      base_price: p.base_price,
      order: p.order,
      is_icon: p.is_icon,
      card: `cards/${name}.png`,
      aspect: p.photo_size[0] / p.photo_size[1],
    },
  };
  const composition = await selectComposition({ serveUrl, id: "Reveal", inputProps, browserExecutable: BROWSER });

  let lastPct = -1;
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    crf: 17,
    audioCodec: null,
    outputLocation: silent,
    inputProps,
    browserExecutable: BROWSER,
    concurrency: Number(process.env.CONCURRENCY ?? 3),
    onProgress: ({ progress }) => {
      const pct = Math.floor(progress * 4) * 25;
      if (pct !== lastPct && pct > 0) process.stdout.write(`  ${(lastPct = pct)}%`);
    },
  });

  const bed = path.join(PUBLIC, "audio", p.is_icon ? "reveal_icon.wav" : "reveal_regular.wav");
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", silent, "-i", bed,
    "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "48000",
    "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k",
    "-shortest", "-movflags", "+faststart", final]);
  fs.unlinkSync(silent);

  const secs = ((Date.now() - started) / 1000).toFixed(0);
  console.log(`\n[${i + 1}/${chosen.length}] ${p.sequence.toString().padStart(2, "0")} ${p.name} -> ${path.basename(final)} (${secs}s)`);
  log.push({ sequence: p.sequence, name: p.name, file: path.relative(ROOT, final), seconds: Number(secs) });
}

fs.writeFileSync(path.join(LOGS, `render_${Date.now()}.json`), JSON.stringify(log, null, 1));
console.log(`\nRendered ${log.length} video(s) into ${path.relative(process.cwd(), OUT)}`);
