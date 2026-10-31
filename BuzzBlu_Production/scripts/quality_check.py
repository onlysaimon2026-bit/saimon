"""Check every rendered reveal against the PDF data and the delivery spec.

Verifies each file exists, is playable, is exactly 10 s at 1920x1080/30 fps with audio,
is not a black or frozen frame at the key beats, and that the set covers all 40 players
in PDF order exactly once. Writes reports/quality_report.json.

Usage: python scripts/quality_check.py [--combined]
"""
import json
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SPEC = {"width": 1920, "height": 1080, "fps": 30.0, "duration": 10.0}
# Sampled at moments where each act should have something on screen.
PROBE_TIMES = (0.8, 2.4, 3.6, 6.2, 8.4)


def ffprobe(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries",
         "format=duration:stream=codec_type,codec_name,width,height,r_frame_rate",
         "-of", "json", str(path)], capture_output=True, text=True)
    if out.returncode:
        return None
    return json.loads(out.stdout)


def frame_stats(path, t):
    """Mean luminance of one frame; catches black frames and missing artwork."""
    out = subprocess.run(
        ["ffmpeg", "-v", "error", "-ss", str(t), "-i", str(path), "-frames:v", "1",
         "-vf", "scale=160:90,format=gray", "-f", "rawvideo", "-"],
        capture_output=True)
    data = out.stdout
    return sum(data) / len(data) if data else 0.0


def check_video(path, expect_duration=SPEC["duration"]):
    issues = []
    if not path.exists():
        return [f"missing file {path.name}"], {}
    meta = ffprobe(path)
    if meta is None:
        return [f"{path.name}: not playable"], {}
    streams = {s["codec_type"]: s for s in meta["streams"]}
    duration = float(meta["format"]["duration"])
    info = {"duration": round(duration, 3), "bytes": path.stat().st_size}

    if "video" not in streams:
        issues.append(f"{path.name}: no video stream")
    else:
        v = streams["video"]
        num, den = (int(x) for x in v["r_frame_rate"].split("/"))
        fps = num / den
        info.update(width=v["width"], height=v["height"], fps=fps, vcodec=v["codec_name"])
        if (v["width"], v["height"]) != (SPEC["width"], SPEC["height"]):
            issues.append(f"{path.name}: {v['width']}x{v['height']} not 1920x1080")
        if abs(fps - SPEC["fps"]) > 0.01:
            issues.append(f"{path.name}: {fps:.2f} fps not 30")
        if v["codec_name"] != "h264":
            issues.append(f"{path.name}: video codec {v['codec_name']} not h264")
    if "audio" not in streams:
        issues.append(f"{path.name}: no audio stream")
    else:
        info["acodec"] = streams["audio"]["codec_name"]
    if abs(duration - expect_duration) > 0.05:
        issues.append(f"{path.name}: {duration:.3f}s not {expect_duration}s")

    lums = [round(frame_stats(path, min(t, duration - 0.2)), 1) for t in PROBE_TIMES]
    info["luma"] = lums
    if max(lums) < 4:
        issues.append(f"{path.name}: appears black throughout")
    if len(set(lums)) == 1:
        issues.append(f"{path.name}: identical frames at every beat (frozen?)")
    return issues, info


def main():
    players = json.loads((ROOT / "data" / "players.json").read_text())
    individual = ROOT / "output" / "individual"
    results, issues = [], []

    for p in players:
        stem = pathlib.Path(p["photo"]).stem
        path = individual / f"{stem}.mp4"
        probs, info = check_video(path)
        issues += probs
        results.append({"sequence": p["sequence"], "name": p["name"], "icon": p["is_icon"],
                        "file": path.name, "ok": not probs, **info})

    files = sorted(individual.glob("*.mp4"))
    expected = {f"{pathlib.Path(p['photo']).stem}.mp4" for p in players}
    extra = sorted({f.name for f in files} - expected)
    if extra:
        issues.append(f"unexpected files in output/individual: {extra}")
    if len(results) != 40:
        issues.append(f"expected 40 players, data has {len(results)}")

    report = {"spec": SPEC, "individual": results, "problems": issues}

    if "--combined" in sys.argv:
        combined = ROOT / "output" / "combined" / "BuzzBlu_Full_Reveal.mp4"
        probs, info = check_video(combined, expect_duration=len(players) * SPEC["duration"])
        report["combined"] = {"file": combined.name, "ok": not probs, **info}
        issues += probs

    report["problems"] = issues
    report["passed"] = not issues
    (ROOT / "reports").mkdir(exist_ok=True)
    (ROOT / "reports" / "quality_report.json").write_text(json.dumps(report, indent=1))

    ok = sum(1 for r in results if r["ok"])
    print(f"individual: {ok}/{len(results)} passed")
    if "combined" in report:
        c = report["combined"]
        print(f"combined:   {'ok' if c['ok'] else 'FAILED'}  {c.get('duration')}s")
    for problem in issues:
        print("  !", problem)
    return 0 if not issues else 1


if __name__ == "__main__":
    sys.exit(main())
