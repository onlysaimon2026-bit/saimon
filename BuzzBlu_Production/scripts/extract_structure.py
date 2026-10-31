"""Extract the team leaders and build the running order of the full film.

`extract_players.py` handles the 40 auction players. This script adds the four team
leaders from their spotlight slides and the chapter slides (round dividers, position
categories, the four-icon line-up), then writes the segment list the combined film
follows — the same top-to-bottom order as the PDF.

Writes data/managers.json and data/segments.json.

Usage: python scripts/extract_structure.py
"""
import json
import pathlib
import re

import sys

import pymupdf

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from extract_players import player_image, spans

ROOT = pathlib.Path(__file__).resolve().parent.parent
PDF = ROOT / "source" / "BuzzBlu_Auction_2026.pdf"

MANAGER_PAGES = [5, 6, 7, 8]
# Chapter slides, in the order the PDF presents them.
DIVIDER_PAGES = {4: "leaders", 16: "icons", 22: "regulars"}
# Pages of the position slides. CATEGORY_PAGES is the PDF's own order and still decides
# which players belong to which category; CATEGORY_ORDER is the order the film plays
# them in, which runs from the strikers back to the goalkeepers. The midfield umbrella
# slide (33) keeps its place ahead of the three midfield categories it introduces.
CATEGORY_PAGES = [23, 29, 33, 34, 41, 51, 56, 62, 64]
CATEGORY_ORDER = [64, 62, 56, 33, 51, 41, 34, 29, 23]
LINEUP_PAGE = 17

# Durations in seconds for the non-player segments.
DIVIDER_SECONDS = 4.0
CATEGORY_SECONDS = 4.0
LINEUP_SECONDS = 6.0


def at_size(sp, size, tol=0.3):
    return [s for s in sp if abs(s["size"] - size) < tol]


def tidy(text):
    return re.sub(r"\s{2,}", " ", text).strip()


def read_manager(doc, page_no, index):
    """Leader slides share the player layout: name 40 pt, role 26 pt, team 20 pt."""
    page = doc[page_no - 1]
    sp = spans(page)
    band = [s for s in sp if 130 <= s["bbox"][1] <= 290]
    top = max((s["size"] for s in band), default=0)
    name = tidy(" ".join(s["text"] for s in sorted(
        (s for s in band if abs(s["size"] - top) < 0.3), key=lambda s: s["bbox"][1])))
    role = tidy(" ".join(s["text"] for s in at_size(sp, 26.1)))
    # The team and the "01 / 04" counter are the same size; the team sits on the left.
    small = sorted(at_size(sp, 20.1), key=lambda s: s["bbox"][0])
    team = tidy(small[0]["text"]) if small else ""
    order = next((tidy(s["text"]).replace(" ", "") for s in small
                  if re.match(r"^\d+\s*/\s*\d+$", s["text"].strip())), "")

    pix, xref = player_image(doc, page)
    slug = re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")
    stem = f"L{index:02d}_{slug}"
    out = ROOT / "assets" / "player_photos" / f"{stem}.png"
    pix.save(out)
    return {"sequence": index, "page": page_no, "name": name, "role": role, "team": team,
            "order": order, "image_xref": xref, "photo": str(out.relative_to(ROOT)),
            "photo_size": [pix.width, pix.height]}


def read_divider(page):
    sp = spans(page)
    body = [s for s in sp if s["bbox"][1] > 70 and s["size"] >= 22]
    big = sorted([s for s in body if s["size"] >= 40], key=lambda s: s["bbox"][1])
    rest = sorted([s for s in body if s["size"] < 40], key=lambda s: s["bbox"][1])
    return {"title": [tidy(s["text"]) for s in big],
            "subtitle": tidy(rest[0]["text"]) if rest else ""}


def read_category(page):
    sp = spans(page)
    # The title is the biggest type in the headline band; long names are set smaller.
    band = [s for s in sp if 80 < s["bbox"][1] < 190]
    top = max((s["size"] for s in band), default=0)
    title = tidy(" ".join(s["text"] for s in band if abs(s["size"] - top) < 0.3))
    count = tidy(" ".join(s["text"] for s in at_size(sp, 28.0)))
    names = tidy(" ".join(s["text"] for s in sorted(at_size(sp, 22.0), key=lambda s: s["bbox"][1])))
    return {"title": title, "count": count, "names": names}


def main():
    doc = pymupdf.open(PDF)
    players = json.loads((ROOT / "data" / "players.json").read_text())

    managers = [read_manager(doc, p, i + 1) for i, p in enumerate(MANAGER_PAGES)]
    (ROOT / "data" / "managers.json").write_text(json.dumps(managers, indent=1, ensure_ascii=False))

    dividers = {kind: {**read_divider(doc[p - 1]), "page": p} for p, kind in DIVIDER_PAGES.items()}
    categories = {p: {**read_category(doc[p - 1]), "page": p} for p in CATEGORY_PAGES}
    lineup = read_category(doc[LINEUP_PAGE - 1])

    stem = lambda rec: pathlib.Path(rec["photo"]).stem
    segments = []

    def add(kind, seconds, **fields):
        segments.append({"index": len(segments) + 1, "kind": kind, "seconds": seconds, **fields})

    # The spoken opening, if it has been generated, runs before anything else.
    intro_file = ROOT / "data" / "intro_lines.json"
    if intro_file.exists():
        intro = json.loads(intro_file.read_text())
        # Snap to whole frames at 30 fps so the joined film lands on an exact length.
        add("intro", round(round(intro["seconds"] * 30) / 30, 4), id="intro", style="icon",
            lines=intro["lines"],
            cards=[stem(p) for p in players], card_sizes=[p["photo_size"] for p in players],
            leaders=[{"card": stem(m), "size": m["photo_size"], "name": m["name"], "team": m["team"]}
                     for m in managers])

    add("divider", DIVIDER_SECONDS, id="div_leaders", style="leader", **dividers["leaders"])
    for m in managers:
        add("manager", 10.0, id=stem(m), style="leader", page=m["page"], name=m["name"],
            role=m["role"], team=m["team"], order=m["order"], photo=m["photo"],
            photo_size=m["photo_size"])

    add("divider", DIVIDER_SECONDS, id="div_icons", style="icon", **dividers["icons"])
    icons = [p for p in players if p["is_icon"]]
    add("lineup", LINEUP_SECONDS, id="icon_lineup", style="icon",
        title=read_category(doc[LINEUP_PAGE - 1])["title"], page=LINEUP_PAGE, cards=[stem(p) for p in icons],
        card_sizes=[p["photo_size"] for p in icons], names=[p["name"] for p in icons])
    for p in icons:
        add("player", 10.0, id=stem(p), style="icon", page=p["page"], category="ICON PLAYER",
            sequence=p["sequence"])

    add("divider", DIVIDER_SECONDS, id="div_regulars", style="regular", **dividers["regulars"])
    regulars = [p for p in players if not p["is_icon"]]
    for page in CATEGORY_ORDER:
        cat = categories[page]
        add("category", CATEGORY_SECONDS, id=f"cat_{re.sub(r'[^a-z0-9]+', '_', cat['title'].lower())}",
            style="regular", page=page, title=cat["title"], count=cat["count"], names=cat["names"])
        # A category owns the players that follow it, up to the next category slide.
        nxt = next((q for q in CATEGORY_PAGES if q > page), 10 ** 6)
        group = [q for q in regulars if page < q["page"] < nxt]
        for p in group:
            add("player", 10.0, id=stem(p), style="regular", page=p["page"],
                category=cat["title"], sequence=p["sequence"])
        # The category closes with every one of its cards together in one frame.
        if group:
            add("lineup", LINEUP_SECONDS, id=f"line_{re.sub(r'[^a-z0-9]+', '_', cat['title'].lower())}",
                style="regular", page=page, title=cat["title"], cards=[stem(q) for q in group],
                card_sizes=[q["photo_size"] for q in group], names=[q["name"] for q in group])

    total = sum(s["seconds"] for s in segments)
    placed = {s["sequence"] for s in segments if s["kind"] == "player"}
    problems = []
    if placed != {p["sequence"] for p in players}:
        problems.append("some players are missing from the running order")
    if len(managers) != 4:
        problems.append(f"expected 4 team leaders, found {len(managers)}")

    (ROOT / "data" / "segments.json").write_text(json.dumps(
        {"total_seconds": total, "segments": segments}, indent=1, ensure_ascii=False))

    for s in segments:
        label = s.get("name") or s.get("title") or " / ".join(s.get("title", []) or [])
        if isinstance(label, list):
            label = " ".join(label)
        print(f"{s['index']:3d} {s['kind']:<9} {s['seconds']:4.1f}s  {s['style']:<7} {label}")
    mins, secs = divmod(total, 60)
    print(f"\n{len(segments)} segments, {total:.0f}s = {int(mins)}m {secs:04.1f}s"
          f"   problems: {problems or 'none'}")


if __name__ == "__main__":
    main()
