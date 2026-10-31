"""Extract every player's data and card artwork from the BuzzBlu auction PDF.

The PDF is the single source of truth. For each player slide we take:
  - the name, position, base price and auction order exactly as written,
  - the player's designed card image, which is the one large image on the slide
    that is not part of the shared slide template.

Writes assets/player_photos/*.png, assets/extracted_cards/*.png (page renders kept
for visual verification), data/players.json and reports/extraction_report.json.

Usage: python scripts/extract_players.py
"""
import json
import pathlib
import re
import shutil
import sys

import pymupdf

ROOT = pathlib.Path(__file__).resolve().parent.parent
PDF = ROOT / "source" / "BuzzBlu_Auction_2026.pdf"
# Images that make up the slide template rather than a player: background plates,
# rules, the thin footer bar, the empty card frame and the vertical divider.
TEMPLATE_XREFS = {8, 10, 12, 24, 34, 40, 42, 48, 51, 53, 66, 70, 72, 74, 76, 82, 95, 97, 99,
                  101, 103, 105, 107, 109, 111, 113, 115, 153, 284}
ICON_MARK = "ICON PLAYER / LIVE AUCTION"
REGULAR_MARK = "PLAYER / LIVE AUCTION"


def spans(page):
    out = []
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            for s in line["spans"]:
                text = s["text"].strip()
                if text:
                    out.append({"text": text, "size": round(s["size"], 1), "bbox": s["bbox"]})
    return out


# Every live-auction slide uses the same layout: the heading sits at y=111, the name
# below it, then the position at y=302. Long names are set smaller to fit, so the name
# is found by its band rather than by a fixed size.
NAME_BAND = (130.0, 290.0)
POSITION_SIZE, PRICE_SIZE, ORDER_SIZE = 26.1, 48.0, 20.1


def read_slide(page):
    """Pull one player's fields off a live-auction slide, exactly as written."""
    sp = spans(page)
    joined = " | ".join(s["text"] for s in sp)
    if REGULAR_MARK not in joined:
        return None

    def at(size):
        return [s for s in sp if abs(s["size"] - size) < 0.2]

    # The name occupies the band under the heading, on one or two lines.
    in_band = [s for s in sp if NAME_BAND[0] <= s["bbox"][1] <= NAME_BAND[1]]
    if in_band:
        top = max(s["size"] for s in in_band)
        in_band = [s for s in in_band if abs(s["size"] - top) < 0.2]
    name = " ".join(s["text"] for s in sorted(in_band, key=lambda s: s["bbox"][1]))
    position = " ".join(s["text"] for s in at(POSITION_SIZE))
    # The currency sign and the amount are separate spans in the same 48 pt line.
    price = "".join(s["text"] for s in sorted(at(PRICE_SIZE), key=lambda s: s["bbox"][0]))
    order = next((s["text"] for s in at(ORDER_SIZE) if re.match(r"^\d+\s*/\s*\d+$", s["text"])), "")

    tidy = lambda t: re.sub(r"\s{2,}", " ", t).strip()
    return {"name": tidy(name), "position": tidy(position), "base_price": tidy(price),
            "order": tidy(order).replace(" ", ""), "is_icon": ICON_MARK in joined}


def player_image(doc, page):
    """The largest non-template image on the slide is the player's card artwork."""
    infos = [i for i in page.get_image_info(xrefs=True) if i["xref"] not in TEMPLATE_XREFS]
    if not infos:
        return None, None
    best = max(infos, key=lambda i: i["width"] * i["height"])
    pix = pymupdf.Pixmap(doc, best["xref"])
    if pix.n > 3:
        pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
    return pix, best["xref"]


def main():
    doc = pymupdf.open(PDF)
    photos = ROOT / "assets" / "player_photos"
    cards = ROOT / "assets" / "extracted_cards"
    photos.mkdir(parents=True, exist_ok=True)
    cards.mkdir(parents=True, exist_ok=True)
    # Clear previous output so a renamed player cannot leave a stale file behind.
    for old in list(photos.glob("*.png")) + list(cards.glob("*.png")):
        old.unlink()

    players, problems, overrides = [], [], []
    for index, page in enumerate(doc):
        rec = read_slide(page)
        if rec is None:
            continue
        seq = len(players) + 1
        slug = re.sub(r"[^a-z0-9]+", "_", rec["name"].lower()).strip("_")
        stem = f"{seq:02d}_{slug}"

        pix, xref = player_image(doc, page)
        if pix is None:
            problems.append(f"page {index + 1} ({rec['name']}): no card image found")
            continue
        photo = photos / f"{stem}.png"
        pix.save(photo)
        # A corrected card supplied by the tournament replaces the one in the PDF.
        # Only artwork is overridden here; names and prices still come from the slide.
        override = ROOT / "assets" / "card_overrides" / f"{stem}.png"
        if override.exists():
            shutil.copyfile(override, photo)
            overrides.append(stem)
        # Page render at 2x, kept so the extraction can be checked against the slide.
        page.get_pixmap(dpi=144).save(cards / f"{stem}_slide.png")

        for field in ("name", "position", "base_price", "order"):
            if not rec[field]:
                problems.append(f"page {index + 1} ({rec['name'] or '?'}): missing {field}")

        players.append({"sequence": seq, "page": index + 1, **rec, "image_xref": xref,
                        "photo": str(photo.relative_to(ROOT)),
                        "photo_size": [pix.width, pix.height],
                        "slide": str((cards / f"{stem}_slide.png").relative_to(ROOT))})

    icons = [p for p in players if p["is_icon"]]
    if len(players) != 40:
        problems.append(f"expected 40 players, found {len(players)}")
    if len(icons) != 4:
        problems.append(f"expected 4 icon players, found {len(icons)}")
    dupes = {p["name"] for p in players if sum(q["name"] == p["name"] for q in players) > 1}
    if dupes:
        problems.append(f"duplicate names: {sorted(dupes)}")

    (ROOT / "data").mkdir(exist_ok=True)
    (ROOT / "data" / "players.json").write_text(json.dumps(players, indent=1, ensure_ascii=False))
    (ROOT / "reports").mkdir(exist_ok=True)
    (ROOT / "reports" / "extraction_report.json").write_text(json.dumps(
        {"pdf": PDF.name, "pages": doc.page_count, "players": len(players),
         "icons": len(icons), "regulars": len(players) - len(icons),
         "card_overrides": overrides, "problems": problems}, indent=1))

    for p in players:
        print(f"{p['sequence']:02d} p{p['page']:02d} {'ICON' if p['is_icon'] else '    '} "
              f"{p['order']:>6} {p['base_price']:>5}  {p['name']:<22} {p['position']}")
    print(f"\n{len(players)} players ({len(icons)} icons), problems: {problems or 'none'}")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
