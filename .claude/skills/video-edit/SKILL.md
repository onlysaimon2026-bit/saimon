---
name: video-edit
description: Edit a finished talking-head video into a premium 45-second 9:16 reel with face-tracked camera moves, accurate Bangla captions, glass motion graphics, sound design, original music, natural colour, clean voice and lip-tone correction. Use when the user shares a video (file or Google Drive link) and asks to edit it, add motion graphics, make a reel/short, or improve colour/voice.
---

# Talking-head reel editing

This repo holds a reproducible pipeline (Remotion + ffmpeg + Python). Reuse it; do not rebuild it.

| Path | What it does |
|---|---|
| `render-reel.mjs` | Full 9:16 pipeline: EDL cut, grade, voice cleanup, lip tone, face tracking, music, Remotion render, ducked mix |
| `src/reel/` | `Reel` composition: face-aware `Camera`, Bangla `Captions`, glass `Graphics` (label, keyword, orbit tiles, trend, headline, end) |
| `src/components/glass.ts` | Shared smoked-glass style. Keep every graphic on it for one visual identity |
| `tools/lip_tone.py` | MediaPipe lip mask, gentle lightness/warmth lift (strength 0.85) |
| `tools/face_track.py` | Per-frame face centre/size for reframing |
| `tools/music.py` | Original royalty-free music bed that follows the story arc |
| `tools/to-9x16.sh` | Fit a non-vertical render into 1080x1920 over a blurred copy |
| `projects/saimon-reel.json` | Worked example of a full edit plan: copy its shape for new videos |
| `render.mjs` + `src/Main.tsx` | Older 3:4 overlay style (intro card, callouts, outro). Use only if asked |

## Setup (fresh container)

```bash
npm install
apt-get update -qq && apt-get install -y -qq libegl1 libgles2   # needed by MediaPipe
python3 -m venv $SCRATCH/venv && $SCRATCH/venv/bin/pip install -q faster-whisper mediapipe opencv-python-headless numpy
```

Chromium for Remotion is already at `/opt/pw-browsers/...` (the scripts point at it). Model files
(`out/sh.rnnn`, `out/face_landmarker.task`) download automatically on first run.

## Getting the video

- Google Drive: `curl -sSL -o v.mp4 "https://drive.usercontent.google.com/download?id=<FILE_ID>&export=download&confirm=t"`.
  If it returns 403 the environment network policy blocks Drive: tell the user to allow
  `drive.google.com` and `drive.usercontent.google.com` (or Full access) in the environment settings.
  The Drive connector cannot move files this big (base64 through the context).
- Chat uploads are limited to ~30 MB.

## Workflow

1. **Inspect**: `ffprobe` size/fps/duration; contact sheet of frames; look for burned-in text (name tags) that a 9:16 crop would cut.
2. **Transcribe Bangla accurately**. Generic Whisper large-v3 is poor on Bangladeshi Bangla. Use faster-whisper with
   `SayedShaun/bengali-whisper-medium-ct2` (word timestamps) and cross-check with
   `IamSanjid/tugstugi_bengaliai-regional-asr_whisper-medium-ct2`. Pass audio as a numpy array (the bundled `av` breaks file input).
3. **Analyse delivery**: 20 ms RMS envelope (`astats`) to find real silences (trim candidates), emphatic peaks,
   and the long pause before the key line. Detect jump cuts as single-frame spikes in `scene` score.
4. **Write the plan** (`projects/<name>.json`), all times in OUTPUT seconds except captions (source seconds):
   - `edl`: pieces in play order. Use a 1–2 s cold-open teaser of the strongest line, then the talk with only true silences removed, so the total lands on 45.0 s.
   - `cuts`: output times of every join and source cut (resets face smoothing).
   - `camera`: keyframes `{t, zoom, x?, ease: cut|smooth|push|snap}`. Alternate medium/close on cuts (invisible jump cuts), push in on key statements, push out between ideas, keep zoom >= ~1.3 while burned-in text would show.
   - `captions`: phrase lines with word timings; mark keywords `hl`. **Never caption words the two models disagree on**: leave that span uncaptioned and list it for the user.
   - `graphics`: few and purposeful, only where they explain the spoken idea. Top band (y ~8.5%) for chips/headline/chart, label at y ~60%. Nothing over the face.
   - `sfx`: restrained (~15 for 45 s): impact on hook and strongest moment, riser into the key pause, clicks for UI graphics. Not on every cut.
   - `music`: `{peakStart, peakEnd, volume}`; peak = strongest moment through the ending.
   - `grade`: ffmpeg chain. Sample a white object; e.g. a green/cyan cast fixed with `colorchannelmixer=rr=1.13:gg=0.985:bb=0.99,eq=contrast=1.04:saturation=1.04:gamma=1.02,hqdn3d=1.5:1.5:3:3`.
5. **Render**: `PYTHON=$SCRATCH/venv/bin/python node render-reel.mjs <video> projects/<name>.json out/<name>.mp4`
   - `PREVIEW=13-21` renders just that range; `SKIP_PREP=1` reuses the graded footage and face track after plan-only changes.
6. **QC before delivering**: duration exactly 45.000, 1080x1920, source fps; `ebur128` ≈ -14 LUFS, peak ≤ -1.5 dBFS; contact sheet
   of ~14 frames checking face not covered, captions readable, burned-in text hidden, first frame has open eyes.
7. **Deliver** with `SendUserFile`, a timestamped table of edit decisions, and the list of uncertain caption lines for the user to confirm.

## Rules

- Never alter the face (no AI face, beauty filter or reshaping). Only crop, reframe, colour, lip tone.
- Never invent dialogue or reorder it in a way that changes meaning; a teaser repeat of the user's own line is fine.
- No speed ramps on speech; no random zooms, glitches or flashes.
- Use only original or licensed audio (generate music with `tools/music.py`, SFX in `public/sfx/`).
- When killing renders, match with `pgrep -f "[n]ode render"`: an unbracketed pattern matches and kills your own shell.
- Commit `projects/*.json` and code; renders live in `out/` (gitignored).
