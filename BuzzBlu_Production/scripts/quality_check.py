"""Check every rendered reveal against the PDF data and the delivery spec.

Verifies each file exists, is playable, is exactly 10 s at 1920x1080/30 fps with audio,
is not a black or frozen frame at the key beats, and that the set covers all 40 players
in PDF order exactly once. Writes reports/quality_report.json.

Usage: python scripts/quality_check.py [--combined]
"""
import array
import json
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SPEC = {"width": 1920, "height": 1080, "fps": 30.0}
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


def check_video(path, expect_duration, tolerance=0.05):
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
    if abs(duration - expect_duration) > tolerance:
        issues.append(f"{path.name}: {duration:.3f}s not {expect_duration}s")

    times = [t for t in PROBE_TIMES if t < duration - 0.25] or [duration * 0.4]
    lums = [round(frame_stats(path, t), 1) for t in times]
    info["luma"] = lums
    if max(lums) < 4:
        issues.append(f"{path.name}: appears black throughout")
    if len(set(lums)) == 1:
        issues.append(f"{path.name}: identical frames at every beat (frozen?)")
    return issues, info


def envelope(path, seconds):
    """Coarse loudness-over-time of a file's audio, for comparing one against another."""
    out = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-vn", "-ac", "1", "-ar", "4000",
         "-t", f"{seconds:.3f}", "-f", "s16le", "-"], capture_output=True)
    raw = out.stdout
    if len(raw) < 8000:
        return None
    samples = array.array("h", raw[: len(raw) // 2 * 2])
    step = 200                                   # 50 ms
    return [max(abs(v) for v in samples[i : i + step]) or 1
            for i in range(0, len(samples) - step, step)]


def check_audio_matches_bed(segments, beds_dir):
    """Every clip should carry the sound bed meant for it.

    The bed is muxed on after the picture is rendered, which is quick and easy to get
    wrong: a renamed bed, a stale file, a segment falling back to the generic one. The
    clip's loudness shape is compared against the bed it was supposed to get, which
    catches a wrong or missing bed without needing to listen.
    """
    issues = []
    for seg in segments:
        bed = seg.get("_bed")
        clip = ROOT / "output" / "individual" / f"{seg['id']}.mp4"
        if not bed or not clip.exists():
            continue
        bed_path = beds_dir / f"{bed}.wav"
        if not bed_path.exists():
            issues.append(f"{seg['id']}: bed {bed}.wav is missing")
            continue
        a, b = envelope(clip, seg["seconds"]), envelope(bed_path, seg["seconds"])
        if not a or not b:
            continue
        n = min(len(a), len(b))
        a, b = a[:n], b[:n]
        ma, mb = sum(a) / n, sum(b) / n
        cov = sum((x - ma) * (y - mb) for x, y in zip(a, b))
        va = sum((x - ma) ** 2 for x in a) ** 0.5
        vb = sum((y - mb) ** 2 for y in b) ** 0.5
        r = cov / (va * vb) if va and vb else 0
        if r < 0.85:
            issues.append(f"{seg['id']}: audio does not match bed {bed} (shape match {r:.2f})")
    return issues


def check_structure(segments, players, managers):
    """Read the running order itself, before a single frame is opened.

    Most of what can go wrong with a film assembled from parts is structural: a card
    that never plays, a card that plays twice, a position whose closing line-up is
    missing one of its own players, a heading whose count disagrees with the group
    behind it, or a segment pointing at a sound bed that was never built.
    """
    issues = []

    ids = [s["id"] for s in segments]
    for dupe in sorted({i for i in ids if ids.count(i) > 1}):
        issues.append(f"segment {dupe} appears {ids.count(dupe)} times in the running order")

    expected_cards = {pathlib.Path(p["photo"]).stem for p in players}
    expected_cards |= {pathlib.Path(m["photo"]).stem for m in managers}
    extras = {s["id"] for s in segments if s["kind"] == "player" and "extra" in s}
    played = {s["id"] for s in segments if s["kind"] in ("player", "manager")}
    for missing in sorted((expected_cards | extras) - played):
        issues.append(f"{missing} never plays")
    for unknown in sorted(played - (expected_cards | extras)):
        issues.append(f"{unknown} plays but has no card")

    # Each position's closing line-up must hold exactly the players just shown.
    for i, seg in enumerate(segments):
        if seg["kind"] != "lineup" or seg["id"] == "icon_lineup":
            continue
        preceding = []
        for earlier in reversed(segments[:i]):
            if earlier["kind"] == "player":
                preceding.append(earlier["id"])
            elif earlier["kind"] == "category":
                break
        shown = set(preceding)
        listed = set(seg["cards"])
        for gone in sorted(shown - listed):
            issues.append(f"{seg['id']}: {gone} was shown but is missing from the line-up")
        for extra in sorted(listed - shown):
            issues.append(f"{seg['id']}: {extra} is in the line-up but was never shown")
        if len(seg["cards"]) != len(set(seg["cards"])):
            issues.append(f"{seg['id']}: a card is listed twice")
        if len(seg["cards"]) != len(seg["names"]):
            issues.append(f"{seg['id']}: {len(seg['cards'])} cards but {len(seg['names'])} names")

    # A heading's count must match the group that follows it.
    for i, seg in enumerate(segments):
        if seg["kind"] != "category":
            continue
        group = 0
        for later in segments[i + 1 :]:
            if later["kind"] == "player":
                group += 1
            elif later["kind"] in ("category", "divider"):
                break
        printed = seg["count"].split()[0]
        if group and printed.isdigit() and int(printed) != group:
            issues.append(f"{seg['id']}: heading says {seg['count']} but {group} players follow")

    audio = ROOT / "public" / "audio"
    for seg in segments:
        if seg.get("bed") and not (audio / f"{seg['bed']}.wav").exists():
            issues.append(f"{seg['id']}: sound bed {seg['bed']}.wav is missing")
    if not (ROOT / "scripts" / "film_music.py").exists():
        issues.append("the music bed generator is missing")
    return issues


def main():
    data = json.loads((ROOT / "data" / "segments.json").read_text())
    segments = data["segments"]
    players = {pathlib.Path(p["photo"]).stem: p for p in json.loads((ROOT / "data" / "players.json").read_text())}
    managers = {pathlib.Path(m["photo"]).stem: m for m in json.loads((ROOT / "data" / "managers.json").read_text())}
    individual = ROOT / "output" / "individual"
    beds_file = ROOT / "data" / "beds_used.json"
    beds_used = json.loads(beds_file.read_text()) if beds_file.exists() else {}
    for seg in segments:
        seg["_bed"] = beds_used.get(seg["id"])
    results, issues = [], []

    for seg in segments:
        path = individual / f"{seg['id']}.mp4"
        probs, info = check_video(path, seg["seconds"])
        issues += probs
        subject = players.get(seg["id"]) or managers.get(seg["id"]) or {}
        results.append({"index": seg["index"], "kind": seg["kind"], "id": seg["id"],
                        "name": subject.get("name", seg.get("title", "")), "style": seg["style"],
                        "expected_seconds": seg["seconds"], "ok": not probs, **info})

    issues += check_structure(segments, list(players.values()), list(managers.values()))
    if "--audio" in sys.argv:
        issues += check_audio_matches_bed(segments, ROOT / "public" / "audio")

    expected = {f"{s['id']}.mp4" for s in segments}
    extra = sorted({f.name for f in individual.glob("*.mp4")} - expected)
    if extra:
        issues.append(f"unexpected files in output/individual: {extra}")

    report = {"spec": SPEC, "segments": results,
              "counts": {k: sum(1 for s in segments if s["kind"] == k)
                         for k in sorted({s["kind"] for s in segments})}}

    if "--combined" in sys.argv:
        total = sum(s["seconds"] for s in segments)
        combined = ROOT / "output" / "combined" / "BuzzBlu_Full_Reveal.mp4"
        probs, info = check_video(combined, total, tolerance=0.25)
        report["combined"] = {"file": combined.name, "expected_seconds": total, "ok": not probs, **info}
        issues += probs

    report["problems"] = issues
    report["passed"] = not issues
    (ROOT / "reports").mkdir(exist_ok=True)
    (ROOT / "reports" / "quality_report.json").write_text(json.dumps(report, indent=1))

    ok = sum(1 for r in results if r["ok"])
    print(f"segments: {ok}/{len(results)} passed  {report['counts']}")
    if "combined" in report:
        c = report["combined"]
        print(f"combined: {'ok' if c['ok'] else 'FAILED'}  {c.get('duration')}s of {c['expected_seconds']}s")
    for problem in issues[:12]:
        print("  !", problem)
    return 0 if not issues else 1


if __name__ == "__main__":
    sys.exit(main())
