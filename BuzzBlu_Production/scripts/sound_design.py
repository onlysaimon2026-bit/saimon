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
import json
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


def stomp(d, tone=52, punch=1.0):
    """A deep stadium drum: the stamp of a crowd on a stand."""
    t = seconds(d)
    skin = np.sin(2 * np.pi * (tone + 70 * np.exp(-t * 26)) * t) * np.exp(-t * 9)
    thud = band_noise(d, 60, 420) * np.exp(-t * 16) * 0.6
    return (skin + thud) * punch


def clap(d=0.4, spread=1.0):
    """Crowd clap: a few noise bursts a few milliseconds apart, so it is a crowd."""
    t = seconds(d)
    out = np.zeros(len(t))
    for offset in (0.0, 0.011, 0.023, 0.036):
        k = int(offset * SR)
        burst = band_noise(d, 900, 5200) * np.exp(-np.clip(t - offset, 0, None) * 38)
        burst[:k] = 0
        out += burst * (1.0 - offset * 8 * spread)
    return out / (np.max(np.abs(out)) + 1e-9)


def roar(d, peak):
    """A crowd lifting into a moment and settling after it."""
    t = seconds(d)
    env = np.exp(-((t - peak) ** 2) / (2 * (d * 0.16) ** 2))
    body = band_noise(d, 200, 2600) * (0.55 + 0.45 * np.sin(2 * np.pi * 0.7 * t))
    return body * env


def motif(voice, notes, step=0.33):
    """A short heroic line, so the bed is composed rather than only sound effects."""
    harmonics = {"leader": (1.0, 0.3, 0.16, 0.08),
                 "icon": (1.0, 0.66, 0.44, 0.26, 0.14),
                 "regular": (1.0, 0.38, 0.16, 0.07)}[voice]
    total = step * len(notes) + 1.6
    out = np.zeros(int(total * SR))
    for i, m in enumerate(notes):
        note = tone_stack(1.5 if i < len(notes) - 1 else 2.2, (m, m + 12), harmonics, 0.9, 0.06, 0.8)
        place(out, i * step, note, 0.85 - i * 0.05)
        place(out, i * step, bell(0.9, 440 * 2 ** ((m + 24 - 69) / 12), (1.0, 2.0, 3.01), rate=3.4), 0.12)
    return out


def comb(x, delay, gain):
    """Feedback comb, stepped a delay-length at a time so it stays vectorised."""
    d = int(delay * SR)
    y = np.copy(x)
    for i in range(d, len(y), d):
        block = min(d, len(y) - i)
        y[i : i + block] += gain * y[i - d : i - d + block]
    return y


def allpass(x, delay, gain=0.62):
    d = int(delay * SR)
    y = np.copy(x)
    for i in range(d, len(y), d):
        block = min(d, len(y) - i)
        y[i : i + block] += gain * y[i - d : i - d + block]
    return y * (1 - gain) - np.concatenate([np.zeros(d), x[:-d]]) * gain


def reverb(x, size=1.0, damp=4200):
    """Schroeder hall: four combs into two allpasses. This is what makes the mix
    sound like a stadium rather than a pile of dry samples."""
    tail = np.zeros(len(x) + int(1.4 * SR))
    tail[: len(x)] = x
    wet = np.zeros_like(tail)
    for delay, gain in ((0.0297, 0.80), (0.0371, 0.78), (0.0411, 0.76), (0.0437, 0.74)):
        wet += comb(tail, delay * size, gain)
    wet = allpass(allpass(wet / 4, 0.005), 0.0017)
    wet = one_pole(wet, damp)
    return wet[: len(x)]


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
    """Mono core of the swing, kept for the chapter beds."""
    return _swing_parts(voice)["mono"]


def _swing_parts(voice):
    """The card arcing in, built from the parts a real pass-by is made of:

    a low rumble growing as it approaches, three bands of air at different rates so the
    turbulence is not one flat hiss, a tonal doppler that rises on approach and drops as
    it passes, the bright zing of the metal edge catching the light at the closest point,
    and a short tail of rotation after it.
    """
    d = 1.35
    n = int(d * SR)
    t = np.arange(n) / SR
    pass_at = 0.56 * d          # the moment it is closest to the listener

    # Asymmetric envelope: a long approach, a quick departure.
    approach = np.exp(-((t - pass_at) ** 2) / (2 * (0.22 * d) ** 2))
    depart = np.exp(-np.clip(t - pass_at, 0, None) * 5.5)
    env = np.clip(approach * 0.75 + depart * 0.45, 0, 1.2)

    # Air: three bands sweeping at different speeds gives the whoosh its body.
    air = (sweep_noise(d, 300, 2600, curve=1.4)[:n] * 0.9
           + sweep_noise(d, 900, 6200, curve=2.0)[:n] * 0.55
           + sweep_noise(d, 2400, 9000, curve=2.6)[:n] * 0.28)
    air *= env

    # Rumble underneath, only while it is coming toward us.
    rumble = band_noise(d, 45, 260)[:n] * np.clip(approach * 1.3, 0, 1) * 0.5

    # Doppler: pitch climbs on approach, drops away after the pass.
    ratio = 1.0 + 0.42 * np.tanh((pass_at - t) * 4.5)
    base = {"leader": 190, "icon": 240, "regular": 300}[voice]
    doppler = np.sin(2 * np.pi * np.cumsum(base * ratio) / SR) * env * 0.35
    doppler += np.sin(2 * np.pi * np.cumsum(base * 1.5 * ratio) / SR) * env * 0.12

    # The edge of the card catching the light, right on the pass.
    zing = np.zeros(n)
    zing_src = bell(0.9, {"leader": 2950, "icon": 2450, "regular": 3200}[voice],
                    (1.0, 2.41, 4.2, 6.6), bright=1.3, rate=4.2)
    place(zing, pass_at - 0.02, zing_src, {"leader": 0.3, "icon": 0.22, "regular": 0.16}[voice])

    # Rotation tail: the card still turning as it settles.
    tail = np.zeros(n)
    place(tail, pass_at + 0.06, sweep_noise(0.55, 3800, 700)[: int(0.55 * SR)]
          * np.exp(-seconds(0.55) * 5.0), 0.3)
    place(tail, pass_at + 0.42, bell(0.35, 5200, (1.0, 2.1), rate=9.0), 0.07)  # lock tick

    mono = air * 0.7 + rumble + doppler + zing + tail
    mono /= np.max(np.abs(mono)) + 1e-9

    # Stereo: the card crosses from left to right as it passes.
    pan = np.clip(0.5 + 0.5 * np.tanh((t - pass_at) * 5.0), 0, 1)
    left = mono * np.cos(pan * np.pi / 2)
    right = mono * np.sin(pan * np.pi / 2)
    # A few samples of delay on the far side sells the movement.
    shift = int(0.0007 * SR)
    stereo = np.stack([np.concatenate([np.zeros(shift), left])[:n],
                       np.concatenate([right, np.zeros(shift)])[:n]], axis=1)
    return {"mono": mono, "stereo": stereo, "pass_at": pass_at}


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
def place_stereo(buf, start, sig, gain=1.0):
    i = int(start * SR)
    if i >= len(buf):
        return
    sig = sig[: len(buf) - i]
    buf[i : i + len(sig)] += sig * gain


def finish(bus, fade=0.45, stereo_layers=()):
    """Glue the sub, fade the tail to silence, soft clip and normalise."""
    low = one_pole(bus, 150) * 0.5
    bus = bus * 0.78 + low
    k = int(fade * SR)
    bus[-k:] *= np.linspace(1, 0, k) ** 1.6
    bus[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))
    bus = np.tanh(bus * 0.8) / np.tanh(0.8)
    out = np.stack([bus, np.roll(bus, int(0.009 * SR))], axis=1)
    for start, sig, gain in stereo_layers:
        place_stereo(out, start, sig, gain)
    out = np.tanh(out * 0.82) / np.tanh(0.82)
    out /= np.max(np.abs(out)) + 1e-9
    return out * 0.89


def reveal_bed(voice):
    n = int(10.0 * SR)
    bus = np.zeros(n)        # dry
    send = np.zeros(n)       # fed to the hall
    root = {"leader": 31, "icon": 33, "regular": 36}[voice]
    # Choir for leaders, brass for icons, a clean synth bed for regular players.
    harmonics = {"leader": (1.0, 0.34, 0.2, 0.11, 0.06),
                 "icon": (1.0, 0.72, 0.5, 0.34, 0.2, 0.12),
                 "regular": (1.0, 0.4, 0.18, 0.08)}[voice]
    chord_a = [root, root + 7, root + 12, root + 19]
    chord_b = ([root + 5, root + 12, root + 17, root + 24] if voice != "regular"
               else [root + 3, root + 10, root + 15, root + 22])
    # A rising line over the chord, answered after the name appears.
    lead = {"leader": (root + 19, root + 24, root + 26, root + 31),
            "icon": (root + 12, root + 19, root + 24, root + 23),
            "regular": (root + 12, root + 15, root + 19, root + 22)}[voice]

    def put(start, sig, dry=1.0, wet=0.0):
        place(bus, start, sig, dry)
        if wet:
            place(send, start, sig, wet)

    # 0.0-1.5 brand intro
    put(0.0, tone_stack(3.3, chord_a, harmonics, 0.75, 0.6, 0.9), 0.38, 0.22)
    put(0.30, logo_sting(voice), 0.5, 0.42)
    put(0.0, crowd(10.0), 0.018, 0.0)

    # 1.5-3.0 the stand starts stamping: four on the floor with claps between.
    for i in range(4):
        t0 = 1.50 + i * 0.30
        put(t0, stomp(0.75, 50, 0.55 + i * 0.09), 0.30, 0.16)
        if i:
            put(t0 - 0.15, clap() * (0.3 + i * 0.07), 0.12, 0.2)
        put(t0, bell(0.5, 2600 + i * 300, (1.0, 2.4, 3.8), rate=4.5), 0.035, 0.1)
    put(1.55, roar(3.0, 1.6), 0.09, 0.14)
    put(1.72, sweep_noise(1.28, 200, 3000, curve=1.8) * np.linspace(0, 1, int(1.28 * SR)) ** 2, 0.15, 0.18)

    # 2.72 swing, 3.00 arrival: the biggest moment in the clip.
    swing = _swing_parts(voice)
    swing_at = 3.00 - swing["pass_at"]          # so the pass lands exactly on the impact
    put(swing_at, swing["mono"], 0.0, 0.26)     # reverb send only; the dry part is stereo
    put(3.00, card_arrival(voice), 0.82, 0.45)
    put(3.00, roar(3.4, 0.5), 0.14, 0.2)
    put(3.00, stomp(1.4, 44, 1.0), 0.3, 0.2)
    put(3.10, motif(voice, lead[:2], 0.42), 0.3, 0.3)
    put(4.30, bell(1.1, 2480, (1.0, 2.4, 4.1), rate=3.4), 0.07, 0.16)
    # Half-time pulse keeps the energy up under the hero section.
    for i in range(6):
        put(3.60 + i * 0.60, stomp(0.6, 48, 0.4), 0.14, 0.08)
        put(3.90 + i * 0.60, clap() * 0.3, 0.05, 0.09)

    # 5.00 details
    put(5.00, details_reveal(voice), 0.6, 0.4)
    put(5.20, motif(voice, lead, 0.36), 0.26, 0.26)
    put(6.30, sweep_noise(0.45, 900, 4200) * np.exp(-seconds(0.45) * 6), 0.06, 0.1)
    put(7.30, sweep_noise(0.7, 320, 2200, curve=1.6) * np.linspace(0, 1, int(0.7 * SR)) ** 2, 0.09, 0.12)
    put(7.55, roar(2.2, 0.8), 0.08, 0.12)

    # 8.00 signature
    put(7.84, card_swing(voice) * 0.6, 0.0, 0.18)
    put(8.00, signature_hit(voice), 0.78, 0.5)
    put(8.00, tone_stack(1.9, chord_b, harmonics, 0.7, 0.2, 0.7), 0.32, 0.3)
    put(8.00, stomp(1.6, 42, 1.0), 0.3, 0.22)
    put(8.00, roar(2.0, 0.45), 0.1, 0.16)

    # Duck everything else for the half second before the impact so the swing reads.
    dip = np.ones(n)
    a, b = int(2.46 * SR), int(2.99 * SR)
    dip[a:b] = np.minimum(1.0, 0.42 + 0.58 * np.abs(np.linspace(-1, 1, b - a)) ** 2)
    bus *= dip
    send *= dip

    stereo = [(swing_at, swing["stereo"], 0.85),
              (7.84, _swing_parts(voice)["stereo"], 0.3)]
    return finish(bus + reverb(send, size=1.15) * 0.5, stereo_layers=stereo)


def segment_bed(kind, count=4):
    """Short beds for the chapter slides, so every slide change has its own sound."""
    length = 6.0 if kind == "lineup" else 4.0
    bus = np.zeros(int(length * SR))
    bright = {"divider": 1.0, "category": 0.85, "lineup": 1.15}[kind]
    place(bus, 0.0, transition(bright), 0.85)
    place(bus, 0.0, tone_stack(length - 0.3, (36, 43, 48, 55), (1.0, 0.45, 0.24, 0.12), 0.6, 0.5, 1.0), 0.3)
    place(bus, 0.55, logo_sting("icon") * 0.35, 0.3)
    if kind == "lineup":
        # One arrival per card, on the same stagger the picture uses.
        step = min(0.5, 2.0 / max(count, 1))
        level = 0.24 / max(1.0, count / 4) ** 0.4
        for i in range(count):
            at = 1.2 + i * step
            place(bus, at - 0.22, card_swing("icon") * 0.5, level * 0.8)
            place(bus, at, impact(1.0, 70 + (i % 5) * 14, 0.5), level)
            place(bus, at, bell(1.0, 1560 * 2 ** ((i % 7) / 12), (1.0, 2.37, 3.6), rate=3.0), level * 0.6)
        place(bus, 1.2 + count * step + 0.5, signature_hit("icon") * 0.55, 0.4)
    else:
        place(bus, 0.62, details_reveal("regular") * 0.55, 0.34)
    place(bus, 0.0, crowd(length) * 0.5, 0.022)
    place(bus, 0.1, roar(min(2.4, length), 0.7), 0.07)
    place(bus, 0.55, stomp(0.9, 46, 0.8), 0.22)
    place(bus, 0.85, clap() * 0.5, 0.1)
    send = np.zeros(len(bus))
    place(send, 0.0, bus.copy(), 0.4)
    return finish(bus + reverb(send, size=1.0) * 0.45, fade=0.5)


def main():
    out = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "public/audio")
    out.mkdir(parents=True, exist_ok=True)
    beds = {f"reveal_{v}": reveal_bed(v) for v in ("leader", "icon", "regular")}
    beds |= {f"seg_{k}": segment_bed(k) for k in ("divider", "category")}
    # A lineup bed for every group size that appears in the running order.
    counts = sorted({len(s["cards"]) for s in
                     json.loads((pathlib.Path(__file__).resolve().parent.parent / "data" / "segments.json").read_text())["segments"]
                     if s["kind"] == "lineup"})
    beds |= {f"seg_lineup_{c}": segment_bed("lineup", c) for c in counts}
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
