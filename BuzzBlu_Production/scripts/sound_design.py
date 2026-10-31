"""Original sound design for the BuzzBlu reveal film.

Everything is synthesised from scratch with numpy, so every sound is original and free
to use commercially. Six beds are produced:

  reveal_leader / reveal_icon / reveal_regular   10 s, one per card tier
  seg_divider / seg_category                      4 s, chapter slides
  seg_lineup                                      6 s, the four-icon frame

Each reveal bed carries its own distinct hits, pinned to the picture:

  0.30  logo sting          the wordmark locking up
  2.72  card swing          the card arcing in from off-axis
  3.00  card arrival        the card landing, with the sub drop under it
  5.00  details reveal      the name and the lines beneath it
  8.00  signature           the closing lockup

The three tiers share that structure so segments cut together, but not a single voice:
leaders get a choir-and-bell treatment, icons a brass one, regular players a tighter
modern one.

Usage: python scripts/sound_design.py <out_dir>
"""
import pathlib
import sys
import wave

import numpy as np

SR = 48000
rng = np.random.default_rng(20260401)


# --------------------------------------------------------------------------- helpers
def seconds(d):
    return np.arange(int(d * SR)) / SR


def place(buf, start, sig, gain=1.0):
    i = int(start * SR)
    if i >= len(buf):
        return
    if i < 0:
        sig, i = sig[-i:], 0
    sig = sig[: len(buf) - i]
    buf[i : i + len(sig)] += sig * gain


def band_noise(d, lo, hi):
    """Band-limited noise, filtered in the frequency domain so it stays fast."""
    n = int(d * SR)
    spec = np.fft.rfft(rng.normal(0, 1, n))
    freqs = np.fft.rfftfreq(n, 1 / SR)
    # Smooth skirts rather than a brick wall, so the band sounds like air not static.
    shape = np.exp(-(((freqs - (lo + hi) / 2) / ((hi - lo) / 2 + 1e-9)) ** 4))
    out = np.fft.irfft(spec * shape, n)
    return out / (np.max(np.abs(out)) + 1e-9)


def sweep_noise(d, f0, f1, curve=1.0):
    """A moving band of noise: several fixed bands crossfaded along the sweep."""
    n = int(d * SR)
    t = np.arange(n) / SR
    centres = np.geomspace(min(f0, f1) * 0.7, max(f0, f1) * 1.3, 9)
    target = f0 * (f1 / f0) ** ((t / d) ** curve)
    out = np.zeros(n)
    for i, c in enumerate(centres):
        lo, hi = c * 0.62, c * 1.62
        gain = np.exp(-((np.log(target / c)) ** 2) / (2 * 0.33 ** 2))
        out += band_noise(d, lo, hi)[:n] * gain
    return out / (np.max(np.abs(out)) + 1e-9)


def sub_drop(d, f0, f1, rate):
    t = seconds(d)
    f = f1 + (f0 - f1) * np.exp(-t * 2.2)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * rate)


def bell(d, base, ratios, bright=1.0, rate=1.0):
    """Struck metal: inharmonic partials, each decaying at its own rate."""
    t = seconds(d)
    out = np.zeros(len(t))
    for i, r in enumerate(ratios):
        out += np.sin(2 * np.pi * base * r * t + i) * np.exp(-t * rate * (1.6 + 1.1 * i)) / (i + 1.5) ** (1 / bright)
    return out / (np.max(np.abs(out)) + 1e-9)


def tone_stack(d, midi, harmonics, bright=1.0, attack=0.4, release=0.5):
    """Sustained voice built from harmonics; the weighting sets brass vs choir vs pad."""
    t = seconds(d)
    out = np.zeros(len(t))
    for m in midi:
        f = 440 * 2 ** ((m - 69) / 12)
        for det in (-0.06, 0.0, 0.06):
            ff = f * 2 ** (det / 12)
            for h, w in enumerate(harmonics, start=1):
                out += np.sin(2 * np.pi * ff * h * t + h * 0.7) * w
    env = np.minimum(1, t / attack) * np.minimum(1, (d - t) / release)
    env = np.clip(env, 0, 1) ** 1.2
    return out / (np.max(np.abs(out)) + 1e-9) * env * bright


def impact(d, tone, bright=1.0):
    t = seconds(d)
    crack = rng.normal(0, 1, len(t)) * np.exp(-t * 150) * 0.55 * bright
    body = np.sin(2 * np.pi * tone * t) * np.exp(-t * 7)
    tail = band_noise(d, 120, 3200) * np.exp(-t * 3.0) * 0.16 * bright
    return crack + body + tail


def crowd(d):
    t = seconds(d)
    swell = 0.6 + 0.4 * np.sin(2 * np.pi * 0.11 * t) + 0.2 * np.sin(2 * np.pi * 0.037 * t)
    return band_noise(d, 180, 2400) * swell


def one_pole(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR)
    b = 1 - a
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = b * x[i] + a * acc
        y[i] = acc
    return y


# --------------------------------------------------------------- the five named hits
def logo_sting(voice):
    """The wordmark lands. Same gesture every time so it reads as the BuzzBlu sound."""
    base = {"leader": 1050, "icon": 1240, "regular": 1680}[voice]
    out = np.zeros(int(2.4 * SR))
    place(out, 0.0, bell(2.3, base, (1.0, 2.76, 5.4, 8.93, 11.3), bright=1.3, rate=0.8), 0.85)
    place(out, 0.0, bell(1.4, base * 2, (1.0, 2.0, 3.01), rate=2.4), 0.3)
    place(out, 0.0, sweep_noise(0.55, 5200, 900) * np.exp(-seconds(0.55) * 5), 0.3)
    place(out, 0.02, sub_drop(1.5, 95, 40, 2.6), 0.55)
    return out


def card_swing(voice):
    """The card arcing in: a band of air moving past, with a touch of doppler."""
    d = 0.78
    t = seconds(d)
    body = sweep_noise(d, 380, 4200, curve=1.5)
    env = np.exp(-((t - 0.62 * d) ** 2) / (2 * (0.19 * d) ** 2))
    out = body * env
    if voice == "leader":
        out += bell(d, 3100, (1.0, 2.41, 4.2), rate=3.2) * 0.22 * env
    elif voice == "icon":
        out += np.sin(2 * np.pi * np.cumsum(170 + 520 * (t / d) ** 2) / SR) * env * 0.2
    return out


def card_arrival(voice):
    """The card locking into frame: hit, sub, and the metal ringing after it."""
    out = np.zeros(int(3.2 * SR))
    tone = {"leader": 44, "icon": 48, "regular": 58}[voice]
    place(out, 0.0, impact(3.0, tone, 1.0), 0.95)
    place(out, 0.0, sub_drop(2.7, 135, 25, 1.25), 0.8)
    if voice == "leader":
        place(out, 0.01, bell(2.6, 880, (1.0, 2.2, 3.7, 5.9, 8.4), bright=1.4, rate=0.7), 0.42)
        place(out, 0.01, tone_stack(2.4, (45, 52, 57, 64), (1.0, 0.5, 0.3, 0.18, 0.1), 0.9, 0.25, 0.9), 0.3)
    elif voice == "icon":
        place(out, 0.02, bell(1.9, 1480, (1.0, 2.37, 3.41, 4.83), rate=1.6), 0.3)
        place(out, 0.0, tone_stack(2.2, (36, 43, 48), (1.0, 0.8, 0.55, 0.35, 0.2), 0.85, 0.12, 0.8), 0.34)
    else:
        place(out, 0.02, bell(1.5, 1920, (1.0, 2.37, 3.41), rate=2.2), 0.26)
        place(out, 0.0, tone_stack(1.9, (40, 47, 52), (1.0, 0.45, 0.22, 0.1), 0.8, 0.1, 0.7), 0.26)
    place(out, 0.05, sweep_noise(0.9, 6000, 700) * np.exp(-seconds(0.9) * 4), 0.17)
    return out


def details_reveal(voice):
    """The name and the lines under it: a rising figure, not another impact."""
    out = np.zeros(int(3.0 * SR))
    steps = {"leader": (0, 7, 12, 19), "icon": (0, 5, 12, 17), "regular": (0, 7, 12, 16)}[voice]
    base = {"leader": 1320, "icon": 1560, "regular": 1760}[voice]
    for i, semis in enumerate(steps):
        place(out, 0.02 + i * 0.145, bell(1.5, base * 2 ** (semis / 12), (1.0, 2.0, 3.02), rate=3.0),
              0.3 - i * 0.045)
    place(out, 0.0, impact(1.6, 72, 0.45), 0.3)
    place(out, 0.0, sub_drop(1.5, 78, 33, 2.5), 0.26)
    place(out, 0.0, sweep_noise(0.8, 700, 5200) * np.linspace(0, 1, int(0.8 * SR)) ** 2, 0.13)
    if voice == "leader":
        place(out, 0.0, tone_stack(2.6, (52, 59, 64, 71), (1.0, 0.42, 0.26, 0.14), 0.75, 0.3, 0.9), 0.24)
    return out


def signature_hit(voice):
    out = np.zeros(int(2.4 * SR))
    tone = {"leader": 40, "icon": 44, "regular": 52}[voice]
    place(out, 0.0, impact(2.2, tone, 1.0), 1.0)
    place(out, 0.0, sub_drop(2.0, 125, 23, 1.8), 0.8)
    place(out, 0.03, bell(1.8, {"leader": 960, "icon": 1320, "regular": 1760}[voice],
                          (1.0, 2.2, 3.6, 5.1), bright=1.2, rate=1.1), 0.3)
    return out


def transition(bright=1.0):
    """The sound of one slide becoming the next: air in, soft hit, shimmer out."""
    out = np.zeros(int(2.2 * SR))
    place(out, 0.0, sweep_noise(0.6, 420, 5200, curve=1.6) * np.linspace(0, 1, int(0.6 * SR)) ** 2, 0.4)
    place(out, 0.55, impact(1.6, 62, 0.7), 0.5 * bright)
    place(out, 0.55, sub_drop(1.5, 105, 30, 2.1), 0.45)
    place(out, 0.58, bell(1.3, 2100, (1.0, 2.37, 3.9), rate=2.6), 0.2 * bright)
    place(out, 0.6, sweep_noise(0.9, 5600, 800) * np.exp(-seconds(0.9) * 4.5), 0.16)
    return out


# ------------------------------------------------------------------------ the beds
def finish(bus, fade=0.45):
    """Glue the sub, fade the tail to silence, soft clip and normalise."""
    low = one_pole(bus, 150) * 0.5
    bus = bus * 0.78 + low
    k = int(fade * SR)
    bus[-k:] *= np.linspace(1, 0, k) ** 1.6
    bus[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))
    bus = np.tanh(bus * 0.8) / np.tanh(0.8)
    bus /= np.max(np.abs(bus)) + 1e-9
    bus *= 0.89
    return np.stack([bus, np.roll(bus, int(0.009 * SR))], axis=1)


def reveal_bed(voice):
    n = int(10.0 * SR)
    bus = np.zeros(n)
    root = {"leader": 31, "icon": 33, "regular": 36}[voice]
    # Choir for leaders, brass for icons, a clean synth bed for regular players.
    harmonics = {"leader": (1.0, 0.34, 0.2, 0.11, 0.06),
                 "icon": (1.0, 0.72, 0.5, 0.34, 0.2, 0.12),
                 "regular": (1.0, 0.4, 0.18, 0.08)}[voice]
    chord_a = [root, root + 7, root + 12, root + 19]
    chord_b = ([root + 5, root + 12, root + 17, root + 24] if voice != "regular"
               else [root + 3, root + 10, root + 15, root + 22])

    # 0.0-1.5 brand intro
    place(bus, 0.0, tone_stack(3.3, chord_a, harmonics, 0.75, 0.6, 0.9), 0.4)
    place(bus, 0.30, logo_sting(voice), 0.5)

    # 1.5-3.0 stadium lights and build-up
    for i, t0 in enumerate((1.50, 1.62, 1.74)):
        place(bus, t0, impact(0.5, 320 + i * 90, 0.45), 0.09)
        place(bus, t0, bell(0.55, 2600 + i * 420, (1.0, 2.4, 3.8), rate=4.0), 0.06)
    place(bus, 1.55, crowd(8.2), 0.034 if voice == "leader" else 0.028)
    place(bus, 1.72, sweep_noise(1.28, 200, 3000, curve=1.8) * np.linspace(0, 1, int(1.28 * SR)) ** 2, 0.15)

    # 2.72 swing, 3.00 arrival
    place(bus, 2.72, card_swing(voice), 0.34)
    place(bus, 3.00, card_arrival(voice), 0.82)
    place(bus, 4.30, bell(1.1, 2480, (1.0, 2.4, 4.1), rate=3.4), 0.08)  # light crossing the metal

    # 5.00 details
    place(bus, 5.00, details_reveal(voice), 0.62)
    place(bus, 6.30, sweep_noise(0.45, 900, 4200) * np.exp(-seconds(0.45) * 6), 0.07)
    place(bus, 7.30, sweep_noise(0.7, 320, 2200, curve=1.6) * np.linspace(0, 1, int(0.7 * SR)) ** 2, 0.09)

    # 8.00 signature
    place(bus, 7.84, card_swing(voice) * 0.6, 0.2)
    place(bus, 8.00, signature_hit(voice), 0.8)
    place(bus, 8.00, tone_stack(1.9, chord_b, harmonics, 0.7, 0.2, 0.7), 0.34)
    return finish(bus)


def segment_bed(kind):
    """Short beds for the chapter slides, so every slide change has its own sound."""
    length = 6.0 if kind == "lineup" else 4.0
    bus = np.zeros(int(length * SR))
    bright = {"divider": 1.0, "category": 0.85, "lineup": 1.15}[kind]
    place(bus, 0.0, transition(bright), 0.85)
    place(bus, 0.0, tone_stack(length - 0.3, (36, 43, 48, 55), (1.0, 0.45, 0.24, 0.12), 0.6, 0.5, 1.0), 0.3)
    place(bus, 0.55, logo_sting("icon") * 0.35, 0.3)
    if kind == "lineup":
        # Four cards arrive one after another.
        for i in range(4):
            place(bus, 1.5 + i * 0.5, card_swing("icon") * 0.5, 0.18)
            place(bus, 1.72 + i * 0.5, impact(1.0, 70 + i * 14, 0.5), 0.22)
            place(bus, 1.74 + i * 0.5, bell(1.0, 1560 * 2 ** (i / 12), (1.0, 2.37, 3.6), rate=3.0), 0.14)
        place(bus, 4.1, signature_hit("icon") * 0.55, 0.4)
    else:
        place(bus, 0.62, details_reveal("regular") * 0.55, 0.34)
    place(bus, 0.0, crowd(length) * 0.5, 0.022)
    return finish(bus, fade=0.5)


def main():
    out = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "public/audio")
    out.mkdir(parents=True, exist_ok=True)
    beds = {f"reveal_{v}": reveal_bed(v) for v in ("leader", "icon", "regular")}
    beds |= {f"seg_{k}": segment_bed(k) for k in ("divider", "category", "lineup")}
    for name, data in beds.items():
        path = out / f"{name}.wav"
        with wave.open(str(path), "wb") as w:
            w.setnchannels(2)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes((data * 32767).astype(np.int16).tobytes())
        print(f"{path}  {len(data) / SR:4.1f}s  peak {20 * np.log10(np.max(np.abs(data))):.1f} dBFS")


if __name__ == "__main__":
    main()
