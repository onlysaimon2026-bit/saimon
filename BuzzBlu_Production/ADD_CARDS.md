# Adding a card after the fact

The auction PDF is still the source for everything printed on it. A card that was not in
that PDF goes in here instead, and the film picks it up without anything else changing:
the running order, that position's player count and its closing line-up all follow.

## 1. Drop the artwork in

Put the PNG in `assets/extra_cards/`. Any size: the card is shown at its own aspect
ratio, so it is never cropped or stretched.

## 2. Describe it

Add an entry to `data/extra_cards.json`, exactly as the details are printed on the card:

```json
[
 {
  "id": "extra_rafid",
  "image": "assets/extra_cards/rafid.png",
  "name": "RAFID AHMED",
  "position": "LEFT WING  (LW)",
  "base_price": "$ 10",
  "order": "37 / 36",
  "category": "LEFT WING"
 }
]
```

- `id` — anything unique; it names the rendered clip.
- `category` — must match a position heading exactly: STRIKER, RIGHT WING, LEFT WING,
  ATTACKING MIDFIELDER, CENTRE MIDFIELDER, DEFENSIVE MIDFIELDER, DEFENDER, GOALKEEPER.
- `base_price` and `order` may be left as `""` if the card does not carry them.

## 3. Rebuild

```bash
cd BuzzBlu_Production
PY=../.venv/bin/python
$PY scripts/extract_structure.py        # inserts the card, updates the count and line-up
$PY scripts/sound_design.py public/audio
rm -f output/individual/cat_<position>.mp4 output/individual/line_<position>.mp4
bash production/finish.sh
```

Only the new card, its position's heading and its line-up are rendered again; the other
sixty-odd clips are left alone. One added card takes about six minutes end to end,
including the combine and the master copy.

To check a change without waiting for a clip:

```bash
node render_segments.mjs --only extra_rafid --still 3.5,6.4
```
