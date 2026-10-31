"""A light music bed that runs under the whole film.

Deliberately understated: a soft pulse, closed hats, a warm pad and a quiet pluck
figure. It is meant to be felt rather than listened to, so it is mixed well below the
reveals and ducked under them at the combine step.

A seamless sixteen-bar loop is built once and tiled to the length asked for, with a slow
movement in brightness and level across the film so it never sounds static.

Usage: python scripts/film_music.py <out.wav> <seconds>
"""
import pathlib
import sys
import wave

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from sound_design import SR, band_noise, one_pole, place, reverb, seconds

BPM = 96
BEAT = 60 / BPM
BAR = 4 * BEAT
BARS = 16
LOOP = BARS * BAR          # 40 s
rng = np.random.default_rng(1909)

# A minor, moving to the relative major and back. One chord per bar.
PROGRESSION = [
    [45, 52, 57, 64], [41, 48, 53, 60], [36, 43, 48, 55], [43, 50, 55, 62],
    [45, 52, 57, 64], [41, 48, 53, 60], [36, 43, 48, 55], [40, 47, 52, 59],
]


def midi(m):
    return 440 * 2 ** ((m - 69) / 12)


def pad(notes, length):
    t = seconds(length)
    out = np.zeros(len(t))
    for m in notes:
        f = midi(m)
        for det in (-0.05, 0.05):
            ff = f * 2 ** (det / 12)
            out += sum(np.sin(2 * np.pi * ff * h * t + h) / h ** 1.9 for h in range(1, 5))
    env = np.minimum(1, t / (length * 0.35)) * np.minimum(1, (length - t) / (length * 0.4))
    return out / len(notes) * env


def pluck(m, length=0.42):
    t = seconds(length)
    f = midi(m)
    tone = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t)
            + 0.16 * np.sin(2 * np.pi * 3 * f * t))
    return tone * np.exp(-t * 11)


def kick(length=0.4):
    t = seconds(length)
    return np.sin(2 * np.pi * (46 + 58 * np.exp(-t * 28)) * t) * np.exp(-t * 11)


def hat(length=0.07, open_=False):
    t = seconds(length)
    return band_noise(length, 6500, 13000) * np.exp(-t * (26 if open_ else 95))


def build_loop():
    n = int(LOOP * SR)
    bus = np.zeros(n)
    send = np.zeros(n)

    for bar in range(BARS):
        chord = PROGRESSION[bar % len(PROGRESSION)]
        start = bar * BAR
        place(bus, start, pad(chord, BAR * 1.05), 0.16)
        place(send, start, pad(chord, BAR * 1.05), 0.1)

        # Pulse on one and three; a softer accent on the and of four to pull the bar over.
        for b in (0, 2):
            place(bus, start + b * BEAT, kick(), 0.3)
        place(bus, start + 3.5 * BEAT, kick(0.3), 0.14)

        for step in range(8):
            at = start + step * BEAT / 2
            place(bus, at, hat(open_=step == 7), 0.055 if step % 2 else 0.035)

        # A quiet four-note figure, only in the second half of each pair of bars.
        if bar % 2 == 1:
            notes = [chord[2] + 12, chord[1] + 12, chord[3], chord[2] + 12]
            for i, m in enumerate(notes):
                place(bus, start + BEAT * (0.5 + i * 0.75), pluck(m), 0.075)
                place(send, start + BEAT * (0.5 + i * 0.75), pluck(m), 0.05)

    mix = bus + reverb(send, size=1.0, damp=5200) * 0.4
    # Make the seam inaudible: fold the last bar back over the first.
    tail = int(BAR * SR)
    fade = np.linspace(0, 1, tail)
    mix[:tail] = mix[:tail] * fade + mix[-tail:] * (1 - fade)
    return mix[:-tail]


def main():
    out = pathlib.Path(sys.argv[1])
    total = float(sys.argv[2])
    loop = build_loop()
    n = int(total * SR)
    tiled = np.tile(loop, int(np.ceil(n / len(loop))))[:n]

    # Slow movement so a ten-minute film never hears the same bar twice the same way.
    t = np.arange(n) / SR
    swell = 0.78 + 0.22 * np.sin(2 * np.pi * t / 97.0) + 0.08 * np.sin(2 * np.pi * t / 41.0)
    bright = 0.55 + 0.45 * (0.5 + 0.5 * np.sin(2 * np.pi * t / 131.0))
    tiled = tiled * swell
    tiled = one_pole(tiled, 900) * (1 - bright) + tiled * bright

    tiled[: int(2.0 * SR)] *= np.linspace(0, 1, int(2.0 * SR)) ** 1.5
    tiled[-int(3.0 * SR):] *= np.linspace(1, 0, int(3.0 * SR)) ** 1.2
    tiled /= np.max(np.abs(tiled)) + 1e-9
    tiled *= 0.85

    stereo = np.stack([tiled, np.roll(tiled, int(0.013 * SR))], axis=1)
    out.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(out), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((stereo * 32767).astype(np.int16).tobytes())
    print(f"{out}  {total:.1f}s  loop {LOOP:.1f}s at {BPM} BPM")


if __name__ == "__main__":
    main()
