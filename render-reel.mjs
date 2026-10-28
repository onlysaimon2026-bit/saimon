// 9:16 reel pipeline.
// Usage: PYTHON=<python with mediapipe/opencv/numpy> node render-reel.mjs <input.mp4> <plan.json> [output.mp4]
//
// 1. Pre-pass at source resolution/frame rate: colour grade, denoise, sharpen, voice cleanup.
// 2. Natural lip-tone correction and face tracking (MediaPipe).
// 3. Original music bed generated to follow the plan's story arc.
// 4. Remotion renders camera moves, graphics, captions and SFX.
// 5. Music is ducked under the voice and the mix is loudness-normalised.
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const [input, planPath, output = "out/reel.mp4"] = process.argv.slice(2);
if (!input || !planPath) {
  console.error("Usage: node render-reel.mjs <input.mp4> <plan.json> [output.mp4]");
  process.exit(1);
}
const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
const py = process.env.PYTHON ?? "python3";
const work = path.resolve("out/reel");
fs.mkdirSync(work, { recursive: true });
fs.mkdirSync("public", { recursive: true });
const run = (cmd, args) => execFileSync(cmd, args, { stdio: ["ignore", "inherit", "inherit"] });
const fetchOnce = (file, url) => {
  if (!fs.existsSync(file)) execFileSync("curl", ["-sSfL", "-o", file, url]);
  return file;
};

const probe = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries",
  "stream=r_frame_rate:format=duration", "-of", "json", input]).toString());
const sourceSeconds = Number(probe.format.duration);

const rnnoise = fetchOnce(path.resolve("out/sh.rnnn"),
  "https://raw.githubusercontent.com/GregorR/rnnoise-models/master/somnolent-hogwash-2018-09-01/sh.rnnn");
const landmarker = fetchOnce(path.resolve("out/face_landmarker.task"),
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task");

const voiceChain = [
  "highpass=f=80",
  `arnndn=m=${rnnoise}:mix=0.85`,
  "afftdn=nr=6:nf=-45",
  "equalizer=f=300:t=q:w=1.2:g=-2.5",
  "equalizer=f=3800:t=q:w=1.5:g=2",
  "highshelf=f=9000:g=1.5",
  "deesser=i=0.4",
  "acompressor=threshold=-21dB:ratio=3:attack=8:release=90:makeup=2",
  "loudnorm=I=-16:TP=-2:LRA=9",
].join(",");

// Edit decision list: [srcStart, srcEnd] pieces played in order (e.g. a cold-open teaser,
// then the talk with dead air removed). Joins get 12 ms audio fades to avoid clicks.
const edl = plan.edl ?? [[0, sourceSeconds]];
const outStart = [];
edl.reduce((acc, [a, b]) => (outStart.push(acc), acc + (b - a)), 0);
const editedSeconds = edl.reduce((acc, [a, b]) => acc + (b - a), 0);
const toOutput = (t) =>
  edl.flatMap(([a, b], i) => (t >= a && t <= b ? [outStart[i] + (t - a)] : []));

// SKIP_PREP=1 reuses the graded/lip-corrected footage and face track from the last run.
const skipPrep = process.env.SKIP_PREP === "1";
const graded = path.join(work, "graded.mp4");
const voice = path.join(work, "voice.wav");
const faceRaw = path.join(work, "face.json");
if (!skipPrep) {
console.log("1/5 Cutting, grading footage and cleaning voice...");
const pieces = edl.map(([a, b], i) =>
  `[0:v]trim=${a}:${b},setpts=PTS-STARTPTS[v${i}];` +
  `[0:a]atrim=${a}:${b},asetpts=PTS-STARTPTS,afade=t=in:d=0.012,afade=t=out:st=${(b - a - 0.012).toFixed(3)}:d=0.012[a${i}];`).join("");
const joins = edl.map((_, i) => `[v${i}][a${i}]`).join("");
const hold = Math.max(0, plan.duration - editedSeconds);
run("ffmpeg", ["-v", "error", "-y", "-i", input, "-filter_complex",
  `${pieces}${joins}concat=n=${edl.length}:v=1:a=1[cv][ca];` +
  `[cv]${plan.grade},unsharp=5:5:0.55:5:5:0,tpad=stop_mode=clone:stop_duration=${hold.toFixed(3)},format=yuv420p[v];` +
  `[ca]${voiceChain},apad=whole_dur=${plan.duration}[a]`,
  "-map", "[v]", "-map", "[a]", "-ar", "48000",
  "-c:v", "libx264", "-crf", "14", "-preset", "medium", "-c:a", "aac", "-b:a", "256k", graded]);
run("ffmpeg", ["-v", "error", "-y", "-i", graded, "-vn", "-ac", "1", voice]);

console.log("2/5 Lip tone and face tracking...");
run(py, ["tools/lip_tone.py", graded, path.resolve("public/reel.mp4"), landmarker, String(plan.lipTone ?? 0.85)]);
run(py, ["tools/face_track.py", "public/reel.mp4", faceRaw, landmarker]);
}

// Smooth the track within each shot (reset at cuts) so reframing glides, never jitters.
const face = JSON.parse(fs.readFileSync(faceRaw, "utf8"));
const cutFrames = (plan.cuts ?? []).map((t) => Math.round(t * face.fps));
const bounds = [0, ...cutFrames, face.frames.length];
const win = Math.round(face.fps * 0.7);
const smoothed = [];
for (let b = 0; b < bounds.length - 1; b++) {
  const seg = face.frames.slice(bounds[b], bounds[b + 1]);
  const valid = seg.filter(Boolean);
  const fallback = valid[0] ?? [face.width / 2, face.height * 0.4, face.height * 0.27];
  seg.forEach((_, i) => {
    let sx = 0, sy = 0, sh = 0, n = 0;
    for (let j = Math.max(0, i - win); j <= Math.min(seg.length - 1, i + win); j++) {
      const f = seg[j] ?? fallback;
      sx += f[0]; sy += f[1]; sh += f[2]; n++;
    }
    smoothed.push([+(sx / n).toFixed(1), +(sy / n).toFixed(1), +(sh / n).toFixed(1)]);
  });
}
face.frames = smoothed;

// Captions are authored in source time; place each line wherever its source span plays.
const captions = (plan.captions ?? []).flatMap((line) =>
  toOutput(line.from).filter((o) => toOutput(line.to).some((e) => Math.abs(e - o - (line.to - line.from)) < 1e-3)).map((o) => ({
    from: +o.toFixed(3),
    to: +(o + line.to - line.from).toFixed(3),
    words: line.words.map((w) => ({ ...w, s: +(o + w.s - line.from).toFixed(3), e: +(o + w.e - line.from).toFixed(3) })),
  })));

console.log("3/5 Generating music...");
const music = path.join(work, "music.wav");
run(py, ["tools/music.py", music, String(plan.duration), String(plan.music.peakStart), String(plan.music.peakEnd)]);

console.log("4/5 Rendering graphics...");
const browserExecutable =
  process.env.REMOTION_CHROME ?? "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const inputProps = { src: "reel.mp4", sourceSeconds: plan.duration, face, plan: { ...plan, captions } };
const composition = await selectComposition({ serveUrl, id: "Reel", inputProps, browserExecutable });
const visual = path.join(work, "visual.mp4");
let lastPct = -1;
await renderMedia({
  composition,
  serveUrl,
  codec: "h264",
  crf: 16,
  outputLocation: visual,
  inputProps,
  browserExecutable,
  // PREVIEW=a-b renders only seconds a..b of the reel.
  ...(process.env.PREVIEW
    ? { frameRange: process.env.PREVIEW.split("-").map((x, i) => Math.round(Number(x) * 60) - i) }
    : {}),
  onProgress: ({ progress }) => {
    const pct = Math.floor(progress * 10) * 10;
    if (pct !== lastPct) console.log(`   ${(lastPct = pct)}%`);
  },
});

console.log("5/5 Mixing music under the voice...");
fs.mkdirSync(path.dirname(output), { recursive: true });
run("ffmpeg", ["-v", "error", "-y", "-i", visual, "-i", music, "-i", voice, "-filter_complex",
  `[1:a]volume=${plan.music.volume}[m];[2:a]apad,aformat=channel_layouts=stereo[key];` +
  "[m][key]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=350[duck];" +
  "[0:a][duck]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.89,loudnorm=I=-14:TP=-1.5:LRA=9[a]",
  "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-ar", "48000",
  "-movflags", "+faststart", ...(process.env.PREVIEW ? [] : ["-t", String(plan.duration)]), output]);
console.log(`Done: ${output}`);
