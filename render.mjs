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

// Scene-cut detection drives the flash/zoom-punch transitions (showinfo logs to stderr).
const sceneLog = spawnSync("ffmpeg", ["-hide_banner", "-i", input, "-vf", "select='gt(scene,0.35)',showinfo",
  "-an", "-f", "null", "-"]).stderr.toString();
const cuts = [...sceneLog.matchAll(/pts_time:([\d.]+)/g)]
  .map((m) => Number(m[1]))
  .filter((t, i, a) => t > 0.5 && (i === 0 || t - a[i - 1] > 1));
console.log(`Video ${width}x${height}, ${videoSeconds.toFixed(1)}s, ${cuts.length} cuts`);

fs.mkdirSync("public", { recursive: true });
fs.copyFileSync(input, path.join("public", "input.mp4"));
fs.mkdirSync(path.dirname(output), { recursive: true });

const overrides = overridesPath ? JSON.parse(fs.readFileSync(overridesPath, "utf8")) : {};

const browserExecutable =
  process.env.REMOTION_CHROME ?? "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";

const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const baseProps = { src: "input.mp4", videoSeconds, width, height };
const comp = await selectComposition({ serveUrl, id: "Main", inputProps: baseProps, browserExecutable });
const inputProps = { ...baseProps, config: { ...comp.props.config, ...overrides, cuts: overrides.cuts ?? cuts } };
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
