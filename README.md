# Saimon Motion

Remotion project that adds motion graphics on top of an already-cut video:

- Kinetic title intro (letter reveal, light sweep, particles, grid floor, rings)
- Automatic scene-cut detection → flash + colour wipe + zoom punch on each cut
- Slow cinematic push-in and colour grade on the footage
- Animated lower thirds, callout text, word-by-word captions
- Progress bar, vignette, film grain
- Outro end card with animated subscribe button

## Render

```bash
npm install
node render.mjs path/to/video.mp4 out/final.mp4 [overrides.json]
```

Width, height, duration and cut points are read from the input video. Text, colours,
lower thirds, callouts and captions live in `src/config.ts`; an `overrides.json` with any
of those keys overrides them for one render. Preview interactively with `npm run studio`.

## Optional clean-up passes (set in the overrides file)

- `grade`: ffmpeg filter chain for colour correction.
- `cleanVoice`: RNNoise denoise, EQ, de-ess and compression on the voice.
- `lipTone`: 0–1 strength for natural lip-tone correction. Needs Python with
  `mediapipe` and `opencv-python-headless` (and `libegl1`); point `PYTHON` at it.

## Vertical export

`tools/to-9x16.sh out/final.mp4 out/final-9x16.mp4` fits the render into 1080x1920 over a
blurred copy of itself for Reels, TikTok and Shorts.
