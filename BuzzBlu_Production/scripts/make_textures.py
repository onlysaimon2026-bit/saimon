"""Generate the stadium texture set once, so the renderer only moves sprites.

Animating SVG turbulence per frame is slow on a CPU-only machine; drifting a
pre-rendered smoke sheet looks better and costs almost nothing.

Usage: python scripts/make_textures.py <out_dir>
"""
import pathlib
import sys

import numpy as np
from PIL import Image

rng = np.random.default_rng(7)


def fractal_noise(h, w, octaves=6, persistence=0.55):
    """Value noise summed over octaves, normalised to 0..1."""
    total = np.zeros((h, w), np.float32)
    amp, norm = 1.0, 0.0
    for o in range(octaves):
        size = max(2, 2 ** (o + 2))
        small = rng.random((size, int(size * w / h) or 2)).astype(np.float32)
        layer = np.asarray(Image.fromarray((small * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC),
                           np.float32) / 255
        total += layer * amp
        norm += amp
        amp *= persistence
    total /= norm
    return (total - total.min()) / (np.ptp(total) + 1e-9)


def save_rgba(path, rgb, alpha):
    img = np.dstack([np.clip(rgb, 0, 255).astype(np.uint8),
                     np.clip(alpha, 0, 255).astype(np.uint8)])
    Image.fromarray(img, "RGBA").save(path)


def main():
    out = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "public/textures")
    out.mkdir(parents=True, exist_ok=True)

    # Smoke sheet: wraps horizontally so it can drift forever.
    h, w = 1024, 2048
    n = fractal_noise(h, w, 7)
    n = (n[:, ::-1] * np.linspace(0, 1, w) + n * np.linspace(1, 0, w))  # cross-fade the seam
    n = (n - n.min()) / (np.ptp(n) + 1e-9)
    veil = np.clip((n - 0.42) * 2.3, 0, 1) ** 1.5
    veil *= np.clip(np.linspace(0, 1, h)[:, None] * 1.6, 0, 1)  # denser toward the floor
    grey = np.dstack([np.full((h, w), 196, np.float32)] * 3)
    save_rgba(out / "smoke.png", grey, veil * 150)

    # Ground haze: a soft band that sits just above the floor line.
    h2, w2 = 512, 2048
    n2 = fractal_noise(h2, w2, 5)
    band = np.exp(-((np.linspace(-1, 1, h2)[:, None]) ** 2) / 0.22)
    save_rgba(out / "haze.png", np.dstack([np.full((h2, w2), 214, np.float32)] * 3),
              np.clip(n2 * band, 0, 1) * 190)

    # Crowd bokeh: out-of-focus stand lights for the back of the bowl.
    h3, w3 = 512, 2048
    canvas = np.zeros((h3, w3), np.float32)
    ys, xs = np.mgrid[0:h3, 0:w3]
    for _ in range(430):
        cx, cy = rng.integers(0, w3), rng.integers(0, h3)
        r = rng.uniform(2.5, 9.0)
        bright = rng.uniform(0.25, 1.0) * (1 - cy / h3 * 0.55)
        x0, x1 = max(0, cx - 30), min(w3, cx + 30)
        y0, y1 = max(0, cy - 30), min(h3, cy + 30)
        d2 = (xs[y0:y1, x0:x1] - cx) ** 2 + (ys[y0:y1, x0:x1] - cy) ** 2
        canvas[y0:y1, x0:x1] += np.exp(-d2 / (2 * r ** 2)) * bright
    canvas = np.clip(canvas, 0, 1.4)
    tint = np.dstack([canvas * 150 + 40, canvas * 215 + 55, canvas * 180 + 70])
    save_rgba(out / "crowd.png", tint, np.clip(canvas * 230, 0, 255))

    # Fine grain, tiled over everything to break up flat gradients.
    g = rng.normal(0.5, 0.17, (512, 512)).clip(0, 1) * 255
    save_rgba(out / "grain.png", np.dstack([g] * 3), np.full((512, 512), 255, np.float32))

    for f in sorted(out.glob("*.png")):
        print(f, Image.open(f).size)


if __name__ == "__main__":
    main()
