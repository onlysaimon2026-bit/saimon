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
