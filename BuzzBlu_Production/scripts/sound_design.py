"""Original sound design for the BuzzBlu player reveal.

Everything here is synthesised from scratch with numpy, so the audio is original and
free to use commercially. One bed is produced per card style; both share the same
10-second structure so segments join seamlessly in the combined film.

Events are pinned to the visual timeline:
  0.00 brand sub-boom and shimmer      1.50 stadium lights snap on
  1.70 riser begins                    3.00 card impact and sub drop
  5.00 hero chord lift                 8.00 final signature impact

Usage: python scripts/sound_design.py <out_dir>
"""
import pathlib
import sys
import wave

import numpy as np

SR = 48000
DUR = 10.0
N = int(SR * DUR)
T = np.arange(N) / SR
rng = np.random.default_rng(20260401)


def place(buf, start, sig, gain=1.0):
    i = int(start * SR)
    if i >= len(buf) or i < 0:
        return
    sig = sig[: len(buf) - i]
    buf[i : i + len(sig)] += sig * gain


def seconds(d):
    return np.arange(int(d * SR)) / SR


def decay(d, rate):
    return np.exp(-seconds(d) * rate)


def sub_drop(d=2.2, f0=120, f1=28, rate=1.6):
    """Pitch falling into a sustained sub: the weight under an impact."""
    t = seconds(d)
    f = f1 + (f0 - f1) * np.exp(-t * 2.2)
    phase = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(phase) * np.exp(-t * rate)


def impact(d=2.6, tone=55, bright=1.0):
    """Cinematic hit: transient crack, body thump and a decaying noise tail."""
    t = seconds(d)
    crack = rng.normal(0, 1, len(t)) * np.exp(-t * 150) * 0.5 * bright
    body = np.sin(2 * np.pi * tone * t) * np.exp(-t * 7)
    tail = rng.normal(0, 1, len(t)) * np.exp(-t * 3.2) * 0.12 * bright
    return crack + body + tail


def riser(d=1.3, f0=220, f1=2600):
    """Noise and tone climbing together into the reveal."""
    t = seconds(d)
    k = (t / d) ** 1.9
    phase = 2 * np.pi * np.cumsum(f0 + (f1 - f0) * k) / SR
    tone = np.sin(phase) * 0.35
    noise = rng.normal(0, 1, len(t)) * k * 0.5
    return (tone + noise) * k


def whoosh(d=0.75, peak=0.55):
    t = seconds(d)
    env = np.exp(-((t - peak * d) ** 2) / (2 * (0.11 * d) ** 2))
    return rng.normal(0, 1, len(t)) * env


def metal(d=1.6, base=1860, ratios=(1.0, 2.37, 3.41, 4.83, 6.12)):
    """Struck-metal shimmer for the card: inharmonic partials over a bright tail."""
    t = seconds(d)
    out = sum(np.sin(2 * np.pi * base * r * t) * np.exp(-t * (4 + 1.8 * i)) / (i + 1.6)
              for i, r in enumerate(ratios))
    return out * 0.6


def pad(d, midi_notes, bright=1.0):
    """Sustained orchestral-style bed from stacked detuned partials."""
    t = seconds(d)
    out = np.zeros(len(t))
    for m in midi_notes:
        f = 440 * 2 ** ((m - 69) / 12)
        for det in (-0.07, 0.0, 0.07):
            ff = f * 2 ** (det / 12)
            out += sum(np.sin(2 * np.pi * ff * h * t + h) / h ** (1.75 / bright)
                       for h in range(1, 7))
    env = np.minimum(1, t / 0.5) * np.minimum(1, (d - t) / 0.6)
    return out / len(midi_notes) * env * 0.25


def crowd(d):
    """Stadium ambience: band-limited noise with a slow swell."""
    t = seconds(d)
    n = rng.normal(0, 1, len(t))
    # Cheap band-pass by differencing (high-pass) then smoothing (low-pass).
    n = np.convolve(np.diff(n, prepend=0), np.ones(180) / 180, mode="same")
    swell = 0.6 + 0.4 * np.sin(2 * np.pi * 0.11 * t) + 0.2 * np.sin(2 * np.pi * 0.037 * t)
    return n * swell * 6


def one_pole(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y


def build(style):
    icon = style == "icon"
    # Icon sits a tone lower and grander; regular is tighter and brighter.
    root = 33 if icon else 36
    chord_a = [root, root + 7, root + 12, root + 19]
    chord_b = [root + 5, root + 12, root + 17, root + 24] if icon else [root + 3, root + 10, root + 15, root + 22]
    bus = np.zeros(N)

    # 0.0-1.5 brand intro
    place(bus, 0.0, pad(3.4, chord_a, 1.2 if icon else 1.0), 0.55)
    place(bus, 0.02, sub_drop(2.0, 90, 32, 2.0), 0.5)
    place(bus, 0.30, metal(1.8, 1240 if icon else 1680), 0.22)
    place(bus, 0.32, whoosh(0.9), 0.1)

    # 1.5-3.0 stadium lights and build-up
    for i, t0 in enumerate((1.50, 1.62, 1.74)):
        place(bus, t0, impact(0.5, 320 + i * 90, 0.5), 0.1)
        place(bus, t0, metal(0.6, 2600 + i * 400), 0.07)
    place(bus, 1.55, crowd(8.2), 0.030 if icon else 0.026)
    place(bus, 1.70, riser(1.30, 200, 2800), 0.17)
    place(bus, 2.72, whoosh(0.5, 0.75), 0.26)

    # 3.0 card reveal
    place(bus, 3.00, impact(3.0, 48 if icon else 58, 1.0), 0.80)
    place(bus, 3.00, sub_drop(2.6, 130, 26, 1.3), 0.72)
    place(bus, 3.02, metal(2.0, 1480 if icon else 1920), 0.30)
    place(bus, 3.00, pad(2.3, chord_a, 1.3), 0.45)
    place(bus, 3.55, whoosh(0.55, 0.5), 0.12)   # card settling into frame
    place(bus, 4.30, metal(1.2, 2480), 0.09)    # light sweeping the metal edge

    # 5.0 hero moment
    place(bus, 5.00, impact(1.8, 70, 0.55), 0.30)
    place(bus, 5.00, pad(3.3, chord_b, 1.1), 0.50)
    place(bus, 5.00, sub_drop(1.6, 80, 34, 2.4), 0.26)
    place(bus, 5.04, metal(1.0, 2150), 0.10)
    place(bus, 6.30, whoosh(0.45, 0.5), 0.07)   # stat line wiping on
    place(bus, 7.30, riser(0.70, 300, 1800), 0.09)

    # 8.0 signature
    place(bus, 7.86, whoosh(0.5, 0.6), 0.22)
    place(bus, 8.00, impact(2.0, 44 if icon else 52, 1.0), 0.85)
    place(bus, 8.00, sub_drop(1.9, 120, 24, 1.9), 0.70)
    place(bus, 8.00, pad(1.9, chord_a, 1.25), 0.42)
    place(bus, 8.03, metal(1.5, 1320 if icon else 1760), 0.20)

    # Keep the sub tidy and make sure the tail reaches silence before the next segment.
    low = one_pole(bus, 160) * 0.55
    bus = bus * 0.75 + low
    tail = np.ones(N)
    k = int(0.45 * SR)
    tail[-k:] = np.linspace(1, 0, k) ** 1.6
    bus *= tail
    bus[: int(0.01 * SR)] *= np.linspace(0, 1, int(0.01 * SR))

    # Soft clip, then normalise the peak; ffmpeg sets the final loudness per clip.
    bus = np.tanh(bus * 0.85) / np.tanh(0.85)
    bus /= np.max(np.abs(bus)) + 1e-9
    bus *= 0.89
    width = int(0.009 * SR)
    return np.stack([bus, np.roll(bus, width)], axis=1)


def main():
    out = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "public/audio")
    out.mkdir(parents=True, exist_ok=True)
    for style in ("icon", "regular"):
        data = build(style)
        path = out / f"reveal_{style}.wav"
        with wave.open(str(path), "wb") as w:
            w.setnchannels(2)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes((data * 32767).astype(np.int16).tobytes())
        print(f"{path}  {DUR:.1f}s  peak {20 * np.log10(np.max(np.abs(data))):.1f} dBFS")


if __name__ == "__main__":
    main()
