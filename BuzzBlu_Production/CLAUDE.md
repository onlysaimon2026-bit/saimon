# BuzzBlu Player Reveal — production notes

The auction PDF in `source/` is the only source of people, artwork and wording. Never
substitute, regenerate or retouch a photograph, and never invent a name, position,
price, team or statistic that is not printed on a slide.

## Pipeline

| Step | Command | Output |
|---|---|---|
| 1. Players | `python scripts/extract_players.py` | `data/players.json`, `assets/player_photos/`, `reports/extraction_report.json` |
| 2. Leaders + running order | `python scripts/extract_structure.py` | `data/managers.json`, `data/segments.json` |
| 3. Stage cards | `cp assets/player_photos/*.png public/cards/` | `public/cards/` |
| 4. Sound design | `python scripts/sound_design.py public/audio` | `public/audio/*.wav` |
| 5. Textures | `python scripts/make_textures.py public/textures` | `public/textures/*.png` |
| 6. Render | `node render_segments.mjs [--only ID] [--kind K] [--from N --to M] [--force]` | `output/individual/*.mp4` |
| 7. Quality check | `python scripts/quality_check.py [--combined]` | `reports/quality_report.json` |
| 8. Combine | `node combine.mjs` | `output/combined/BuzzBlu_Full_Reveal.mp4` |

`render_segments.mjs` skips clips that already exist, so re-running it after a change
only rebuilds what is missing; pass `--force` to rebuild. For a quick look at a change
without waiting for a full clip, use `--still 3.5,6.4`, which writes PNGs of those
moments to `production/previews/`.

## Running order

`data/segments.json` is the film: it lists every segment in the PDF's own top-to-bottom
order with its kind, style and length. `combine.mjs` reads it, so changing the order or
a duration there is all that is needed to re-cut the film.

```
divider  MEET THE FOUR LEADERS        4 s
manager  × 4                         10 s each
divider  ICON PLAYER AUCTION          4 s
lineup   THE FOUR ICONS               6 s
player   × 4 icons                   10 s each
divider  THE REGULAR AUCTION BEGINS   4 s
category + its players, × 9 categories
```

## Engine

`engine/` holds four Remotion compositions — `Reveal`, `Divider`, `CategoryCard`,
`IconLineup` — all driven by props, so every card comes from one scene rather than
sixty hand-built ones.

- `engine/theme.ts` — act boundaries and the three tiers. Leaders get platinum with gold
  trim and a crown, icon players gold, regular players steel blue. All three share the
  tournament green.
- `engine/components/Card.tsx` — the card's path through the shot. It is shown at a
  constant height with its width taken from the source image's aspect ratio, so no card
  is ever cropped or stretched.
- `engine/components/Football.tsx` — the spinning ball in the logo lockup.
- `scripts/sound_design.py` — the beds. Each one is pinned to the same act boundaries as
  the picture, so moving a beat means changing both files.

## Sound

Every sound is synthesised from scratch, so nothing is licensed from anyone. Named hits:
logo sting (0.30 s), card swing (2.72 s), card arrival (3.00 s), details reveal (5.00 s),
signature (8.00 s). The three tiers share that structure but not a single voice — leaders
are choir and bells, icons brass, regular players a tighter modern bed. Chapter slides get
their own transition bed so every slide change lands on a sound.

## Environment

Rendering is CPU-only: headless Chromium plus ffmpeg, no GPU and no Blender. Set
`REMOTION_CHROME` if the bundled Chromium is elsewhere, and `CONCURRENCY` to match the
core count (3 suits a 4-core machine). A 10-second reveal takes roughly two minutes.
