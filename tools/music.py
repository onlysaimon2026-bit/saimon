"""Generate an original, royalty-free background bed that follows the edit's story arc.

Soft pads + plucked arpeggio + light drums in A minor (Am-F-C-G) at 100 BPM.
Sections (seconds): sparse hook, build, fuller payoff, resolve.
Usage: python music.py <out.wav> <duration> [peakStart] [peakEnd]
"""
import sys
import wave

import numpy as np

SR = 48000
out, dur = sys.argv[1], float(sys.argv[2])
peak_start = float(sys.argv[3]) if len(sys.argv) > 3 else dur * 0.7
peak_end = float(sys.argv[4]) if len(sys.argv) > 4 else dur * 0.92
bpm = 100
beat = 60 / bpm
n = int(dur * SR)
t = np.arange(n) / SR
rng = np.random.default_rng(7)


def midi(m):
    return 440 * 2 ** ((m - 69) / 12)


CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]  # Am F C G
bar = 4 * beat


def env_adsr(length, a, r):
    e = np.ones(length)
    ai, ri = int(a * SR), int(r * SR)
    e[:ai] = np.linspace(0, 1, ai)
    e[-ri:] *= np.linspace(1, 0, ri)
    return e


def place(buf, start, sig):
    i = int(start * SR)
    if i >= len(buf):
        return
    sig = sig[: len(buf) - i]
    buf[i : i + len(sig)] += sig


pad = np.zeros(n)
pluck = np.zeros(n)
bass = np.zeros(n)
drums = np.zeros(n)

k = 0
for s in np.arange(0, dur, bar):
    chord = CHORDS[k % 4]
    k += 1
    L = int(bar * SR)
    tt = np.arange(L) / SR
    sig = np.zeros(L)
    for m in chord + [chord[0] + 12]:
        f = midi(m)
        for det in (-0.08, 0.08):  # detuned saw-ish via a few harmonics
            ff = f * 2 ** (det / 12)
            sig += sum(np.sin(2 * np.pi * ff * h * tt) / h ** 1.6 for h in range(1, 6))
    place(pad, s, sig * env_adsr(L, 0.6, 0.8) * 0.035)
    # Bass root
    fb = midi(chord[0] - 12)
    place(bass, s, np.sin(2 * np.pi * fb * tt) * env_adsr(L, 0.02, 0.4) * 0.12)
    # Arpeggio in eighths
    notes = chord + [chord[1] + 12, chord[2] + 12, chord[1] + 12, chord[0] + 12, chord[2]]
    for j, m in enumerate(notes):
        ln = int(beat / 2 * SR * 1.6)
        tp = np.arange(ln) / SR
        f = midi(m + 12)
        tone = (np.sin(2 * np.pi * f * tp) + 0.3 * np.sin(2 * np.pi * 2 * f * tp)) * np.exp(-tp * 9)
        place(pluck, s + j * beat / 2, tone * 0.05)
    # Drums: soft kick on 1 & 3, hat on offbeats, snare-ish clap on 2 & 4
    for b in range(4):
        bt = s + b * beat
        lk = int(0.35 * SR)
        tk = np.arange(lk) / SR
        if b % 2 == 0:
            place(drums, bt, np.sin(2 * np.pi * (50 + 90 * np.exp(-tk * 30)) * tk) * np.exp(-tk * 9) * 0.35)
        else:
            lc = int(0.18 * SR)
            place(drums, bt, rng.normal(0, 1, lc) * np.exp(-np.arange(lc) / SR * 25) * 0.05)
        lh = int(0.05 * SR)
        place(drums, bt + beat / 2, np.diff(rng.normal(0, 1, lh + 1)) * np.exp(-np.arange(lh) / SR * 80) * 0.03)


def ramp(points):
    xs, ys = zip(*points)
    return np.interp(t, xs, ys)


# Story arc: what plays when.
pad_g = ramp([(0, 0.6), (2, 0.8), (peak_start, 0.9), (peak_end, 1.0), (dur - 1.5, 0.8), (dur, 0)])
pluck_g = ramp([(0, 0), (2, 0), (3, 0.7), (peak_start, 0.9), (peak_end, 1.0), (dur - 2, 0.5), (dur, 0)])
bass_g = ramp([(0, 0), (7.5, 0), (8.5, 0.8), (peak_start - 2, 0.8), (peak_start, 1.0), (peak_end, 1.0), (dur - 1.5, 0), (dur, 0)])
drum_g = ramp([(0, 0), (7.9, 0), (8.0, 0.7), (peak_start - 2, 0.75), (peak_start - 1.6, 0), (peak_start, 0), (peak_start + 0.01, 1.0),
               (peak_end, 1.0), (peak_end + 0.3, 0), (dur, 0)])
mix = pad * pad_g + pluck * pluck_g + bass * bass_g + drums * drum_g
# Gentle low-pass on the very start so the hook feels intimate.
mix = mix / (np.max(np.abs(mix)) + 1e-9) * 0.7
stereo = np.stack([mix, np.roll(mix, int(0.012 * SR))], axis=1)
with wave.open(out, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((stereo * 32767).astype(np.int16).tobytes())
print(f"music: {dur:.1f}s, peak {peak_start:.1f}-{peak_end:.1f}s")
