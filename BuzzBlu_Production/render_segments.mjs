// BuzzBlu reveal renderer.
//
//   node render_segments.mjs                  render every segment of the film
//   node render_segments.mjs --only saimon    one segment (id fragment or player name)
//   node render_segments.mjs --kind category  every segment of one kind
//   node render_segments.mjs --from 1 --to 12 a slice of the running order
//   node render_segments.mjs --force          re-render segments that already exist
//   node render_segments.mjs --only saimon --still 3.5,6.4
//                                             PNGs at those seconds, for quick checks
//
// Pictures are rendered silently and the matching sound bed is muxed on afterwards,
// which keeps every clip at the same loudness and keeps the hits exactly on the beats
// of the fixed timeline.
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const PUBLIC = path.join(ROOT, "public");
const OUT = path.join(ROOT, "output", "individual");
const TMP = path.join(ROOT, "production", "temporary");
const LOGS = path.join(ROOT, "production", "logs");
const BROWSER =
  process.env.REMOTION_CHROME ??
  "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";

const arg = (flag) => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? null : process.argv[i + 1];
};
const read = (name) => JSON.parse(fs.readFileSync(path.join(ROOT, "data", name), "utf8"));

const { segments } = read("segments.json");
const players = new Map(read("players.json").map((p) => [path.basename(p.photo, ".png"), p]));
const managers = new Map(read("managers.json").map((m) => [path.basename(m.photo, ".png"), m]));

// Which composition, props and sound bed each kind of segment uses.
const PLAN = {
  player: (s) => {
    const p = players.get(s.id);
    return {
      composition: "Reveal",
      bed: p.is_icon ? "reveal_icon" : "reveal_regular",
      props: {
        subject: {
          name: p.name,
          detail: p.position,
          kicker: `${p.is_icon ? "ICON PLAYER" : "PLAYER"} / LIVE AUCTION`,
          price: p.base_price,
          order: p.order,
          category: s.category,
          style: s.style,
          card: `cards/${s.id}.png`,
          aspect: p.photo_size[0] / p.photo_size[1],
        },
      },
    };
  },
  manager: (s) => {
    const m = managers.get(s.id);
    return {
      composition: "Reveal",
      bed: "reveal_leader",
      props: {
        subject: {
          name: m.name,
          detail: m.team,
          kicker: m.role,
          price: "",
          order: m.order,
          category: "TEAM LEADERS",
          style: "leader",
          card: `cards/${s.id}.png`,
          aspect: m.photo_size[0] / m.photo_size[1],
        },
      },
    };
  },
  intro: (s) => ({
    composition: "Intro",
    bed: "seg_intro",
    props: { lines: s.lines, cards: s.cards, cardSizes: s.card_sizes, leaders: s.leaders },
  }),
  divider: (s) => ({
    composition: "Divider",
    bed: "seg_divider",
    props: { title: s.title, subtitle: s.subtitle, style: s.style },
  }),
  category: (s) => ({
    composition: "CategoryCard",
    bed: "seg_category",
    props: { title: s.title, count: s.count, style: s.style },
  }),
  lineup: (s) => ({
    composition: "IconLineup",
    bed: `seg_lineup_${s.cards.length}`,
    props: {
      title: s.title,
      cards: s.cards,
      sizes: s.card_sizes,
      names: s.names,
      style: s.style,
    },
  }),
};

let chosen = segments;
const only = arg("--only");
if (only) {
  const key = only.toLowerCase();
  chosen = chosen.filter((s) =>
    s.id.toLowerCase().includes(key) || String(s.index) === key ||
    (players.get(s.id)?.name ?? managers.get(s.id)?.name ?? "").toLowerCase().includes(key));
  if (!chosen.length) throw new Error(`no segment matches "${only}"`);
}
const kind = arg("--kind");
if (kind) chosen = chosen.filter((s) => s.kind === kind);
const from = Number(arg("--from") ?? 1);
const to = Number(arg("--to") ?? segments.length);
chosen = chosen.filter((s) => s.index >= from && s.index <= to);
if (!process.argv.includes("--force") && !process.argv.includes("--still")) {
  chosen = chosen.filter((s) => !fs.existsSync(path.join(OUT, `${s.id}.mp4`)));
}
if (!chosen.length) {
  console.log("Nothing to render (pass --force to rebuild existing clips).");
  process.exit(0);
}

const stillTimes = arg("--still")?.split(",").map(Number) ?? null;
for (const dir of [OUT, TMP, LOGS]) fs.mkdirSync(dir, { recursive: true });

console.log(`Bundling engine for ${chosen.length} segment(s)...`);
const serveUrl = await bundle({ entryPoint: path.join(ROOT, "engine", "index.ts"), publicDir: PUBLIC });

const log = [];
for (const [i, segment] of chosen.entries()) {
  const started = Date.now();
  const { composition: compId, bed, props } = PLAN[segment.kind](segment);
  const silent = path.join(TMP, `${segment.id}.mp4`);
  const final = path.join(OUT, `${segment.id}.mp4`);

  const composition = await selectComposition({ serveUrl, id: compId, inputProps: props, browserExecutable: BROWSER });
  composition.durationInFrames = Math.round(segment.seconds * composition.fps);

  // --still renders only the named frames, which is much faster when checking a change.
  if (stillTimes) {
    const dir = path.join(ROOT, "production", "previews");
    fs.mkdirSync(dir, { recursive: true });
    for (const at of stillTimes) {
      const out = path.join(dir, `${segment.id}_${at}s.png`);
      await renderStill({
        composition,
        serveUrl,
        output: out,
        inputProps: props,
        browserExecutable: BROWSER,
        frame: Math.min(composition.durationInFrames - 1, Math.round(at * composition.fps)),
      });
      console.log(`  still ${path.relative(ROOT, out)}`);
    }
    continue;
  }

  let lastPct = -1;
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    crf: 17,
    audioCodec: null,
    outputLocation: silent,
    inputProps: props,
    browserExecutable: BROWSER,
    concurrency: Number(process.env.CONCURRENCY ?? 3),
    onProgress: ({ progress }) => {
      const pct = Math.floor(progress * 4) * 25;
      if (pct !== lastPct && pct > 0) process.stdout.write(`  ${(lastPct = pct)}%`);
    },
  });

  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", silent, "-i", path.join(PUBLIC, "audio", `${bed}.wav`),
    "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "48000",
    "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k",
    "-shortest", "-movflags", "+faststart", final]);
  fs.unlinkSync(silent);

  const secs = Number(((Date.now() - started) / 1000).toFixed(0));
  const label = props.subject?.name ?? (Array.isArray(props.title) ? props.title.join(" ") : props.title);
  console.log(`\n[${i + 1}/${chosen.length}] #${String(segment.index).padStart(2, "0")} ${segment.kind} — ${label} (${secs}s)`);
  log.push({ index: segment.index, kind: segment.kind, id: segment.id, seconds: segment.seconds, render_seconds: secs });
}

fs.writeFileSync(path.join(LOGS, `render_${Date.now()}.json`), JSON.stringify(log, null, 1));
console.log(`\nRendered ${log.length} segment(s) into ${path.relative(process.cwd(), OUT)}`);
