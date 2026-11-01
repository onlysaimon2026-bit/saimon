"""Lay the whole film out as contact sheets, one frame per segment.

Spot checks miss things. This samples every segment of the joined film at the same
point in its own length and tiles them in running order, so the film can be read start
to finish in a few pictures: anything out of place, repeated, missing or misframed shows
up against its neighbours.

Usage: python scripts/contact_sheet.py [--at 0.55] [--per-sheet 24] [--width 300]
"""
import json
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
FILM = ROOT / "output" / "combined" / "BuzzBlu_Full_Reveal.mp4"
OUT = ROOT / "production" / "previews" / "sheets"


def arg(flag, default):
    return type(default)(sys.argv[sys.argv.index(flag) + 1]) if flag in sys.argv else default


def main():
    at = arg("--at", 0.55)          # how far into each segment to sample
    per_sheet = arg("--per-sheet", 24)
    width = arg("--width", 300)
    segments = json.loads((ROOT / "data" / "segments.json").read_text())["segments"]
    if not FILM.exists():
        raise SystemExit(f"{FILM} does not exist yet")

    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("*.png"):
        old.unlink()

    start, shots = 0.0, []
    for seg in segments:
        shots.append((seg, start + seg["seconds"] * at))
        start += seg["seconds"]

    frames = []
    for i, (seg, t) in enumerate(shots):
        frame = OUT / f"f{i:03d}.png"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.3f}", "-i", str(FILM),
                        "-frames:v", "1", "-vf", f"scale={width}:-2", str(frame)], check=True)
        frames.append((frame, seg))

    sheets = []
    for n, chunk in enumerate((frames[i : i + per_sheet] for i in range(0, len(frames), per_sheet))):
        listing = OUT / f"list{n}.txt"
        listing.write_text("".join(f"file '{f}'\nduration 1\n" for f, _ in chunk))
        sheet = OUT / f"sheet{n + 1}.png"
        cols = 6
        rows = (len(chunk) + cols - 1) // cols
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(listing),
                        "-vf", f"tile={cols}x{rows}", "-frames:v", "1", str(sheet)], check=True)
        listing.unlink()
        sheets.append(sheet)
        print(f"{sheet}  segments {chunk[0][1]['index']}-{chunk[-1][1]['index']}")
        for f, seg in chunk:
            label = seg.get("name") or (" ".join(seg["title"]) if isinstance(seg.get("title"), list)
                                        else seg.get("title", "")) or seg["id"]
            print(f"   {seg['index']:3d} {seg['kind']:<9} {label}")
    return sheets


if __name__ == "__main__":
    main()
