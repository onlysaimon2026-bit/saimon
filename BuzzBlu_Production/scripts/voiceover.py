"""Synthesise the opening announcement and lay it out on a timeline.

The voice is a local Piper model, so nothing is sent anywhere and the result is ours to
use. It is then treated like a stadium announcer: the mud taken out, the chest and the
presence lifted, levelled with a compressor, and placed in the same hall as the rest of
the film.

Writes public/audio/intro_vo.wav and data/intro_lines.json, which the intro composition
reads so each line of type appears exactly as it is spoken.

Usage: python scripts/voiceover.py [voice.onnx]
"""
import json
import pathlib
import sys
import wave

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from sound_design import SR, one_pole, place, reverb

ROOT = pathlib.Path(__file__).resolve().parent.parent

# (what the audience reads, what the voice says, how slowly, pause after it)
# The spoken form differs only where the model needs it: a numeral and the brand name.
# Pace is set line by line rather than once for the whole read: short punchy lines get
# rattled off at a single setting, and the two lines the film turns on have to land
# heaviest. The target is roughly 100-125 words a minute, where an announcer sits.
LINES = [
    ("THE STAGE IS SET.", "The stage is set.", 1.34, 0.45),
    ("THE LIGHTS ARE ON.", "The lights are on.", 1.46, 0.6),
    ("40 PLAYERS. COUNTLESS AMBITIONS.", "Forty players. Countless ambitions.", 1.1, 0.8),
    ("HELLO, LEADERS!", "Hello, leaders!", 1.16, 0.4),
    ("WELCOME TO THE BUZZBLU AUCTION.", "Welcome to the Buzz Blue auction.", 1.2, 0.75),
    ("THINK SMART. STRATEGIZE.", "Think smart. Strategize.", 1.12, 0.35),
    ("MAKE YOUR MOVES.", "Make your moves.", 1.3, 0.35),
    ("BUILD YOUR TEAM.", "Build your team.", 1.44, 0.85),
    ("THIS IS NOT JUST A GAME.", "This is not just a game.", 1.55, 0.6),
    ("THIS IS YOUR MOMENT.", "This is your moment.", 1.5, 0.95),
    ("SUPPORTERS, THE CHOICE IS YOURS.", "Supporters, the choice is yours.", 1.16, 0.4),
    ("CHOOSE YOUR TEAM.", "Choose your team.", 1.4, 0.9),
    ("THIS IS BUZZBLU 2026.", "This is Buzz Blue, twenty twenty six.", 1.16, 1.0),
    ("LET THE BATTLE BEGIN.", "Let the battle begin!", 1.5, 2.6),
]

LEAD_IN = 1.4          # darkness before the first word


def synth(voice, text):
    """One spoken line as a float array at the model's rate, resampled to 48 kHz."""
    import io

    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        voice.synthesize_wav(text, w)
    buf.seek(0)
    with wave.open(buf) as w:
        rate = w.getframerate()
        a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    if rate != SR:
        n = int(len(a) * SR / rate)
        a = np.interp(np.linspace(0, len(a) - 1, n), np.arange(len(a)), a)
    # Trim the silence the model leaves at either end so the pacing is ours, not its.
    loud = np.abs(a) > 0.012
    if loud.any():
        a = a[max(0, np.argmax(loud) - int(0.02 * SR)) : len(a) - np.argmax(loud[::-1]) + int(0.05 * SR)]
    return a


def announcer(a):
    """Shape a clean read into a stadium announcement."""
    low = one_pole(a, 170)                       # chest
    mud = one_pole(a, 420) - low                 # the boxy part, taken down
    air = a - one_pole(a, 3000)                  # presence and consonants
    voice = a + low * 0.55 - mud * 0.35 + air * 0.45
    voice -= one_pole(voice, 65)                 # clear the rumble under the voice

    # Levelling: a slow envelope follower pushing the quiet parts up.
    env = one_pole(np.abs(voice), 14) + 1e-6
    gain = np.clip((0.12 / env) ** 0.55, 0.6, 3.2)
    voice *= gain
    voice = np.tanh(voice * 1.25) / np.tanh(1.25)   # a little drive for grit
    return voice / (np.max(np.abs(voice)) + 1e-9)


def main():
    from piper import PiperVoice

    model = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / "assets" / "voice" / "announcer.onnx")
    voice = PiperVoice.load(str(model), config_path=str(model) + ".json")

    takes = []
    for display, spoken, scale, gap in LINES:
        voice.config.length_scale = scale
        takes.append((display, synth(voice, spoken), gap))
    total = LEAD_IN + sum(len(a) / SR + gap for _, a, gap in takes)

    bus = np.zeros(int(total * SR))
    timeline, at = [], LEAD_IN
    for display, a, gap in takes:
        dur = len(a) / SR
        place(bus, at, announcer(a), 0.85)
        timeline.append({"text": display, "at": round(at, 3), "seconds": round(dur, 3)})
        at += dur + gap

    # The same hall the rest of the film sits in, kept light so the words stay crisp.
    wet = reverb(bus * 0.3, size=1.25, damp=3600)
    mix = bus + wet * 0.45
    mix /= np.max(np.abs(mix)) + 1e-9
    mix *= 0.92
    stereo = np.stack([mix, np.roll(mix, int(0.004 * SR))], axis=1)

    out = ROOT / "public" / "audio" / "intro_vo.wav"
    out.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(out), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((stereo * 32767).astype(np.int16).tobytes())

    (ROOT / "data" / "intro_lines.json").write_text(json.dumps(
        {"seconds": round(total, 3), "lead_in": LEAD_IN, "lines": timeline}, indent=1))
    for line in timeline:
        print(f"{line['at']:6.2f}  {line['seconds']:4.2f}s  {60 * len(line['text'].split()) / line['seconds']:4.0f} wpm  {line['text']}")
    print(f"\n{out}  {total:.2f}s")


if __name__ == "__main__":
    main()
