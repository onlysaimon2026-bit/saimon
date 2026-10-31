# How to rebuild the BuzzBlu reveal videos

Everything here is rebuilt from two things: the auction PDF in `source/` and the code in
this folder. No artwork, music or sound effect comes from anywhere else, so the whole
film can be regenerated on any machine with Node and Python.

## One-time setup

```bash
npm install                                   # run from the repository root
apt-get install -y libegl1 libgles2           # Linux only, needed by MediaPipe/Chromium
python3 -m venv .venv
.venv/bin/pip install pymupdf numpy pillow
```

ffmpeg must be on the PATH. Rendering uses headless Chromium, which Remotion downloads
on first run; set `REMOTION_CHROME` to point at an existing Chromium instead.

## Rebuild everything

```bash
cd BuzzBlu_Production
PY=../.venv/bin/python

$PY scripts/extract_players.py          # 40 players + their card artwork from the PDF
cp assets/player_photos/*.png public/cards/
$PY scripts/voiceover.py                # the spoken opening and the position calls
$PY scripts/extract_structure.py        # leaders + running order (needs the voiceover:
                                        # the intro segment is as long as the read)
$PY scripts/sound_design.py public/audio
$PY scripts/make_textures.py public/textures

CONCURRENCY=3 node render_segments.mjs  # every segment, about 90 s each
$PY scripts/quality_check.py            # must report 66/66 passed
node combine.mjs                        # the full film
$PY scripts/quality_check.py --combined
```

Results land in `output/individual/` (one MP4 per card) and
`output/combined/BuzzBlu_Full_Reveal.mp4`.

## Changing one thing

`render_segments.mjs` skips clips that already exist, so after a change you only rebuild
what you want.

| I want to change | Edit | Then run |
|---|---|---|
| The spoken opening's words | `LINES` in `scripts/voiceover.py` | that script, then `sound_design.py`, then `node render_segments.mjs --only intro --force` |
| How loud the background music is | nothing — set `MUSIC_LEVEL` | `MUSIC_LEVEL=0.12 node combine.mjs` |
| The background music itself | `scripts/film_music.py` | `node combine.mjs` |
| A corrected card for one player | drop the PNG in `assets/card_overrides/<id>.png` | `extract_players.py`, copy cards, then re-render that player and their category line-up |
| A sound, or the whole mix | `scripts/sound_design.py` | `… sound_design.py public/audio`, then `node render_segments.mjs --force` (audio is muxed, so this is quick) |
| Colours of a tier | `engine/theme.ts` (`THEMES`) | `node render_segments.mjs --force` |
| When something happens in the 10 s | `engine/theme.ts` (`ACT`) **and** the matching times in `scripts/sound_design.py` | both of the above |
| The card animation | `engine/components/Card.tsx` | `node render_segments.mjs --force` |
| The logo and spinning ball | `engine/components/BrandIntro.tsx`, `components/Football.tsx` | `node render_segments.mjs --force` |
| A chapter slide's look | `engine/Segments.tsx` | `node render_segments.mjs --kind category --force` |
| The order or length of segments | `data/segments.json` | `node combine.mjs` (plus a re-render if a length changed) |
| Stadium lighting, smoke, floor | `engine/components/Stage.tsx` | `node render_segments.mjs --force` |

Useful flags:

```bash
node render_segments.mjs --only saimon          # one card
node render_segments.mjs --kind manager --force # all four leaders
node render_segments.mjs --from 13 --to 18      # a slice of the running order
node render_segments.mjs --only saimon --still 3.5,6.4
```

`--still` writes PNGs of those moments to `production/previews/` in a few seconds, which
is the fast way to check a visual change before committing to a full render.

## If the PDF changes

Re-run `extract_players.py` and `extract_structure.py`. Both read the slides' own layout
rather than hard-coded positions, so new or renamed players are picked up automatically;
`reports/extraction_report.json` lists anything that could not be read. Then delete
`output/individual/` and render again.

## What must never change

The player photographs, names, positions, prices and team names come from the PDF and
are never edited, regenerated or replaced. If a value looks wrong in a video, fix it in
the PDF and re-extract — do not type it into the data files by hand.
