// Usage: node render.mjs <input.mp4> [output.mp4] [overrides.json]
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const [input, output = "out/final.mp4", overridesPath] = process.argv.slice(2);
if (!input) {
  console.error("Usage: node render.mjs <input.mp4> [output.mp4] [overrides.json]");
  process.exit(1);
}

const probe = JSON.parse(
  execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries",
    "stream=width,height:stream_side_data=rotation:format=duration", "-of", "json", input]).toString(),
);
let { width, height } = probe.streams[0];
const rotation = Math.abs(probe.streams[0].side_data_list?.[0]?.rotation ?? 0);
if (rotation === 90 || rotation === 270) [width, height] = [height, width];
// Keep the render at most 1080p on the short side; Remotion needs even dimensions.
const scale = Math.min(1, 1080 / Math.min(width, height));
width = Math.round((width * scale) / 2) * 2;
height = Math.round((height * scale) / 2) * 2;
const videoSeconds = Number(probe.format.duration);

// Cut detection: a jump cut is a single-frame spike in frame difference, which also
// catches same-framing talking-head cuts that a plain scene threshold misses.
const scoreFile = path.resolve("out/scene-scores.txt");
fs.mkdirSync("out", { recursive: true });
spawnSync("ffmpeg", ["-v", "error", "-i", input, "-vf",
  `scale=240:-2,select='gte(scene,0)',metadata=print:file=${scoreFile}`, "-an", "-f", "null", "-"]);
const scores = [];
for (const line of fs.readFileSync(scoreFile, "utf8").split("\n")) {
  const t = line.match(/pts_time:([\d.]+)/);
  const sc = line.match(/scene_score=([\d.]+)/);
  if (t) scores.push({ t: Number(t[1]), s: 0 });
  else if (sc && scores.length) scores[scores.length - 1].s = Number(sc[1]);
}
const cuts = scores
  .filter((f, i) => i > 0 && i < scores.length - 1 && f.t > 0.5 && f.s > 0.06 &&
    f.s > 3 * scores[i - 1].s && f.s > 3 * scores[i + 1].s)
  .map((f) => Math.round(f.t * 100) / 100);
console.log(`Video ${width}x${height}, ${videoSeconds.toFixed(1)}s, ${cuts.length} cuts`);

const overrides = overridesPath ? JSON.parse(fs.readFileSync(overridesPath, "utf8")) : {};

// Pre-pass: colour grade, scale to the render size and normalise loudness, so Remotion
// only composites graphics. `grade` in the overrides file is an ffmpeg filter chain.
const { grade = "", cleanVoice = false, lipTone = 0, ...configOverrides } = overrides;

// Voice cleanup: RNNoise denoise (partially mixed back to keep the natural tone), mud cut,
// presence lift, de-ess and gentle compression before loudness normalisation.
let voice = "loudnorm=I=-14:TP=-1.5:LRA=11";
if (cleanVoice) {
  const model = path.resolve("out/sh.rnnn");
  if (!fs.existsSync(model)) {
    execFileSync("curl", ["-sSfL", "-o", model,
      "https://raw.githubusercontent.com/GregorR/rnnoise-models/master/somnolent-hogwash-2018-09-01/sh.rnnn"]);
  }
  voice = [
    "highpass=f=80",
    `arnndn=m=${model}:mix=0.85`,
    "afftdn=nr=6:nf=-45",
    "equalizer=f=300:t=q:w=1.2:g=-2.5",
    "equalizer=f=3800:t=q:w=1.5:g=2",
    "highshelf=f=9000:g=1.5",
    "deesser=i=0.4",
    "acompressor=threshold=-21dB:ratio=3:attack=8:release=90:makeup=2",
    "loudnorm=I=-14:TP=-1.5:LRA=9",
  ].join(",");
}
fs.mkdirSync("public", { recursive: true });
console.log("Grading footage...");
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", input,
  "-vf", `${grade ? grade + "," : ""}scale=${width}:${height}:flags=lanczos,unsharp=5:5:0.55:5:5:0,fps=30,format=yuv420p`,
  "-af", voice, "-ar", "48000",
  "-c:v", "libx264", "-crf", "14", "-preset", "medium", "-c:a", "aac", "-b:a", "256k",
  path.join("public", "input.mp4")]);

// Optional lip-tone correction (needs Python with mediapipe + opencv; set PYTHON to that interpreter).
if (lipTone > 0) {
  const model = path.resolve("out/face_landmarker.task");
  if (!fs.existsSync(model)) {
    execFileSync("curl", ["-sSfL", "-o", model,
      "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task"]);
  }
  console.log("Correcting lip tone...");
  const graded = path.resolve("out/graded.mp4");
  fs.renameSync(path.join("public", "input.mp4"), graded);
  execFileSync(process.env.PYTHON ?? "python3", [path.resolve("tools/lip_tone.py"), graded,
    path.resolve("public/input.mp4"), model, String(lipTone)], { stdio: ["ignore", "inherit", "ignore"] });
}
fs.mkdirSync(path.dirname(output), { recursive: true });

const browserExecutable =
  process.env.REMOTION_CHROME ?? "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";

const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const baseProps = { src: "input.mp4", videoSeconds, width, height };
const comp = await selectComposition({ serveUrl, id: "Main", inputProps: baseProps, browserExecutable });
const inputProps = { ...baseProps, config: { ...comp.props.config, ...configOverrides, cuts: configOverrides.cuts ?? cuts } };
const composition = await selectComposition({ serveUrl, id: "Main", inputProps, browserExecutable });

let lastPct = -1;
await renderMedia({
  composition,
  serveUrl,
  codec: "h264",
  crf: 18,
  outputLocation: output,
  inputProps,
  browserExecutable,
  onProgress: ({ progress }) => {
    const pct = Math.floor(progress * 100);
    if (pct % 10 === 0 && pct !== lastPct) console.log(`Rendering ${(lastPct = pct)}%`);
  },
});
console.log(`\nDone: ${output}`);
