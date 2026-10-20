#!/usr/bin/env python3
"""Rebuild Wickborn's original sample-free combat cues with Python and ffmpeg.

No packages, recordings, downloads, model APIs, or MIDI sound banks are used.
All source oscillators, noise, filters, envelopes and musical phrases are here.
"""

from __future__ import annotations

import argparse
from array import array
import hashlib
import json
import math
from pathlib import Path
import random
import shutil
import struct
import subprocess
import tempfile
import wave


ROOT = Path(__file__).resolve().parents[1]
MASTERS = ROOT / "art" / "audio"
SOUNDS = ROOT / "public" / "game" / "sounds"
DOCS = ROOT / "docs"
RATE = 44_100
TAU = math.tau
GAP = 0.55

# Duration includes the short dry tail and the final silent guard.
CUES = (
    ("select", 0.24, "Soft wooden selection tick with a small glass overtone"),
    ("deploy", 0.78, "Forward air rush, earth landing and a warm confirmation chime"),
    ("melee", 0.49, "Short directional swing, padded impact and a small metal ring"),
    ("heavy", 0.90, "Weighty low impact, layered debris and a muted armor resonance"),
    ("projectile", 0.62, "Fast air flick and a light traveling whistle"),
    ("magic", 1.08, "Crackling electrical wind with an inharmonic crystalline bloom"),
    ("heal", 1.22, "Gentle rising glass and mallet notes with an airy shimmer"),
    ("tower", 1.36, "Three staggered stone impacts, rubble and a low settling rumble"),
    ("capture", 1.40, "Ascending mallet confirmation with a short bright chord"),
    ("ultimate", 1.98, "A rising energy intake, deep impact and a wide magical release"),
    ("victory", 3.75, "Original C-major brass, mallet and soft percussion fanfare"),
    ("defeat", 2.85, "Restrained descending minor phrase with a low closing chord"),
    ("draw", 2.18, "Two calm unresolved suspended chords and a soft closing mallet"),
)


def db(value: float) -> float:
    return round(20 * math.log10(max(value, 1e-12)), 2)


def midi(number: float) -> float:
    return 440 * 2 ** ((number - 69) / 12)


def envelope(t: float, duration: float, attack: float, release: float, decay: float) -> float:
    if t < 0 or t >= duration:
        return 0.0
    onset = math.sin(min(1.0, t / max(attack, 1 / RATE)) * math.pi / 2) ** 2
    tail = math.sin(min(1.0, (duration - t) / max(release, 1 / RATE)) * math.pi / 2) ** 2
    return onset * tail * math.exp(-decay * t / duration)


class Cue:
    def __init__(self, name: str, duration: float):
        self.name = name
        self.duration = duration
        self.length = round(duration * RATE)
        self.left = array("d", [0.0]) * self.length
        self.right = array("d", [0.0]) * self.length
        self.random = random.Random(int.from_bytes(hashlib.sha256(name.encode()).digest()[:8], "big"))

    def add(self, index: int, sample: float, pan: float) -> None:
        if 0 <= index < self.length:
            angle = (max(-1.0, min(1.0, pan)) + 1) * math.pi / 4
            self.left[index] += sample * math.cos(angle)
            self.right[index] += sample * math.sin(angle)

    def tone(self, start: float, duration: float, frequency: float, amplitude: float,
             partials=((1.0, 1.0),), *, end: float | None = None, attack=0.009,
             release=0.07, decay=3.0, pan=0.0, vibrato=0.0, brightness=0.0) -> None:
        """Band-limited additive voices; inharmonic partials supply metal/glass."""
        phase = 0.0
        first = round(start * RATE)
        for offset in range(round(duration * RATE)):
            index = first + offset
            if index >= self.length:
                break
            t = offset / RATE
            sweep = frequency if end is None else frequency * (end / frequency) ** (t / duration)
            phase += TAU * sweep * (1 + vibrato * math.sin(TAU * 5.1 * t)) / RATE
            value = 0.0
            for ratio, gain in partials:
                if sweep * ratio < RATE * 0.40:
                    # High partials die earlier, mimicking material damping.
                    damping = math.exp(-brightness * max(0.0, ratio - 1) * t)
                    value += gain * damping * math.sin(phase * ratio)
            value *= amplitude * envelope(t, duration, attack, release, decay)
            self.add(index, value, pan)

    def noise(self, start: float, duration: float, amplitude: float, *, low=100.0,
              high=3000.0, end_low=None, end_high=None, attack=0.01,
              release=0.08, decay=2.0, pan=0.0, pulse=0.0) -> None:
        """Smoothed band-pass noise with independently swept upper/lower cutoffs."""
        slower = faster = 0.0
        first = round(start * RATE)
        for offset in range(round(duration * RATE)):
            index = first + offset
            if index >= self.length:
                break
            t = offset / RATE
            fraction = t / duration
            lower = low if end_low is None else low * (end_low / low) ** fraction
            upper = high if end_high is None else high * (end_high / high) ** fraction
            x = self.random.uniform(-1.0, 1.0)
            slower += (1 - math.exp(-TAU * lower / RATE)) * (x - slower)
            faster += (1 - math.exp(-TAU * upper / RATE)) * (x - faster)
            flutter = 1 if not pulse else 0.72 + 0.28 * math.sin(TAU * pulse * t) ** 2
            value = (faster - slower) * amplitude * flutter
            value *= envelope(t, duration, attack, release, decay)
            self.add(index, value, pan)

    def air(self, start=0.0, duration=0.25, amplitude=0.6, pan=0.0, rising=False):
        self.noise(start, duration, amplitude, low=160, high=1600 if rising else 4100,
                   end_low=700 if rising else 90, end_high=5500 if rising else 850,
                   attack=min(0.07, duration / 3), release=duration * 0.4,
                   decay=0.25, pan=pan)

    def impact(self, start=0.0, weight=1.0, pan=0.0, duration=0.34):
        self.tone(start, duration, 135 / weight, 0.68 * weight,
                  ((1, 1), (1.95, 0.22)), end=51 / weight,
                  attack=0.004, release=0.11, decay=5.1, pan=pan, brightness=4)
        self.noise(start + 0.002, duration * 0.70, 0.75 * weight,
                   low=90, high=2100 / weight, attack=0.003, release=0.07,
                   decay=5.4, pan=pan)

    def metal(self, start, frequency=900, amplitude=0.12, duration=0.31, pan=0.0):
        self.tone(start, duration, frequency, amplitude,
                  ((1, 1), (1.47, 0.35), (2.09, 0.21), (3.42, 0.09)),
                  attack=0.003, release=0.08, decay=5.2, pan=pan, brightness=8)

    def mallet(self, start, note, amplitude=0.14, duration=0.55, pan=0.0):
        self.tone(start, duration, midi(note), amplitude,
                  ((1, 1), (2, 0.22), (3.96, 0.17), (6.9, 0.045)),
                  attack=0.005, release=0.1, decay=4.3, pan=pan, brightness=3)

    def horn(self, start, note, duration, amplitude=0.14, pan=0.0):
        self.tone(start, duration, midi(note), amplitude,
                  ((1, 0.64), (2, 0.28), (3, 0.13), (4, 0.07), (5, 0.035)),
                  attack=0.045, release=min(0.17, duration / 3), decay=0.7,
                  pan=pan, vibrato=0.002, brightness=0.45)
        self.noise(start + 0.01, duration * 0.8, amplitude * 0.05,
                   low=600, high=1900, attack=0.04, release=0.1, pan=pan)

    def room(self, amount=0.12, wide=False):
        """Short, filtered early reflections only; deliberately no long wash."""
        left, right = array("d", self.left), array("d", self.right)
        taps = ((0.039, 0.72), (0.071, 0.46), (0.113, 0.29), (0.167, 0.14))
        for delay, gain in taps:
            samples = round(delay * RATE)
            filtered_l = filtered_r = 0.0
            for index in range(samples, self.length):
                source = index - samples
                filtered_l += 0.28 * (left[source] - filtered_l)
                filtered_r += 0.28 * (right[source] - filtered_r)
                self.left[index] += (filtered_r if wide else filtered_l) * amount * gain
                self.right[index] += (filtered_l if wide else filtered_r) * amount * gain

    def master(self):
        # Remove DC, leave generous headroom for several overlapping game cues,
        # and guarantee a smooth endpoint independently of the voice lengths.
        for channel in (self.left, self.right):
            average = 0.0
            for index, sample in enumerate(channel):
                average += (1 - math.exp(-TAU * 12 / RATE)) * (sample - average)
                t = index / RATE
                fade_in = min(1, t / 0.003)
                fade_out = min(1, max(0, (self.duration - 0.035 - t) / 0.085))
                channel[index] = (sample - average) * fade_in * math.sin(fade_out * math.pi / 2) ** 2
        peak = max(max(abs(x) for x in self.left), max(abs(x) for x in self.right), 1e-12)
        target = 10 ** (-6.0 / 20)
        gain = target / peak
        for channel in (self.left, self.right):
            for index in range(self.length):
                channel[index] *= gain
        return self


def synthesize(name, duration):
    s = Cue(name, duration)
    if name == "select":
        s.tone(0.006, 0.14, 620, 0.29, ((1, 1), (2.76, 0.12)),
               attack=0.004, release=0.055, decay=5.8, brightness=6)
        s.noise(0.005, 0.045, 0.18, low=480, high=2200, attack=0.003, release=0.025, decay=3)
    elif name == "deploy":
        s.air(0, 0.22, 0.9, -0.15, rising=True)
        s.impact(0.18, 1.08, duration=0.32)
        s.mallet(0.22, 72, 0.16, 0.38, -0.18)
        s.mallet(0.31, 79, 0.11, 0.29, 0.18)
    elif name == "melee":
        s.air(0, 0.18, 1.12, -0.26)
        s.impact(0.108, 0.85, 0.08, duration=0.25)
        s.metal(0.12, 820, 0.11, 0.23, 0.21)
    elif name == "heavy":
        s.air(0, 0.30, 0.9, -0.16)
        s.impact(0.185, 1.62, duration=0.52)
        s.noise(0.19, 0.48, 0.65, low=30, high=420, decay=4.5, pan=-0.18)
        s.noise(0.23, 0.28, 0.19, low=1100, high=3600, decay=6.0, pan=0.28)
        s.metal(0.20, 430, 0.12, 0.42, 0.10)
    elif name == "projectile":
        s.air(0.01, 0.22, 0.94, -0.40)
        s.tone(0.018, 0.35, 1230, 0.19, ((1, 1), (2.02, 0.15)),
               end=410, attack=0.025, release=0.13, decay=2.6, pan=0.25)
        s.noise(0.20, 0.21, 0.18, low=700, high=2100, decay=3.1, pan=0.45)
    elif name == "magic":
        s.air(0, 0.41, 0.9, -0.22, rising=True)
        s.noise(0.15, 0.57, 0.5, low=900, high=4800, end_low=260,
                end_high=1800, pulse=29, decay=2.3, pan=0.1)
        s.impact(0.29, 0.8, duration=0.31)
        for start, note, pan in ((0.27, 79, -0.34), (0.32, 86, 0.29), (0.39, 90, -0.16)):
            s.mallet(start, note, 0.16, 0.49, pan)
        s.metal(0.30, 690, 0.15, 0.58)
    elif name == "heal":
        s.noise(0.02, 0.84, 0.12, low=1800, high=3900, attack=0.12, decay=0.4, release=0.30)
        for i, note in enumerate((72, 76, 79, 84)):
            s.mallet(0.035 + i * 0.13, note, 0.19 - i * 0.018, 0.60, (-1) ** i * 0.32)
        s.tone(0.10, 0.78, midi(60), 0.075, ((1, 1), (2, 0.18)),
               attack=0.16, release=0.25, decay=0.8, vibrato=0.001)
    elif name == "tower":
        for start, weight, pan in ((0.04, 1.7, -0.16), (0.22, 1.32, 0.29), (0.43, 1.07, -0.27)):
            s.impact(start, weight, pan, duration=0.55)
            s.noise(start + 0.015, 0.39, 0.37, low=230, high=1600, decay=4, pan=pan)
        s.noise(0.15, 0.96, 0.39, low=26, high=210, decay=3.4, release=0.25)
        s.metal(0.34, 265, 0.10, 0.51, 0.17)
    elif name == "capture":
        s.air(0.01, 0.34, 0.30, rising=True)
        for i, note in enumerate((67, 72, 76, 79)):
            s.mallet(0.04 + i * 0.16, note, 0.22, 0.62, -0.35 + i * 0.23)
        for note, pan in ((60, -0.2), (64, 0), (67, 0.2)):
            s.horn(0.52, note, 0.60, 0.065, pan)
    elif name == "ultimate":
        s.air(0.01, 0.75, 0.88, -0.2, rising=True)
        s.tone(0.07, 0.63, 110, 0.14, ((1, 1), (2.03, 0.21), (3.02, 0.1)),
               end=385, attack=0.16, release=0.07, decay=0)
        s.impact(0.64, 1.8, duration=0.73)
        s.noise(0.65, 0.88, 0.69, low=250, high=4700, end_low=60,
                end_high=1000, decay=3.2, attack=0.012, release=0.24, pan=0.3, pulse=17)
        s.noise(0.69, 0.87, 0.34, low=900, high=3800,
                decay=3.7, release=0.23, pan=-0.4, pulse=23)
        s.metal(0.66, 375, 0.15, 0.98)
        for i, note in enumerate((72, 79, 84)):
            s.mallet(0.73 + i * 0.065, note, 0.08, 0.70, -0.3 + i * 0.3)
    elif name == "victory":
        # An original short call-and-response phrase, followed by an open C-major close.
        melody = ((0.03, 76, 0.27), (0.27, 79, 0.30), (0.55, 84, 0.45),
                  (1.02, 83, 0.25), (1.28, 79, 0.29), (1.58, 88, 0.35),
                  (1.96, 84, 1.10))
        for i, (start, note, length) in enumerate(melody):
            s.horn(start, note, length, 0.15, -0.15)
            s.mallet(start + 0.012, note + 12, 0.045, min(0.55, length + 0.12), 0.30)
        for start, chord, length in ((0.03, (48, 55, 64), 0.48), (0.55, (53, 60, 69), 0.48),
                                     (1.02, (55, 62, 71), 0.54), (1.96, (48, 55, 64, 67), 1.13)):
            for i, note in enumerate(chord):
                s.horn(start, note, length, 0.065, -0.43 + i * 0.24)
            s.impact(start, 0.90, duration=0.32)
        for start in (0.03, 0.55, 1.58, 1.96):
            s.noise(start, 0.34, 0.12, low=1800, high=6000,
                    attack=0.005, release=0.20, decay=4, pan=0.35)
        s.mallet(2.45, 91, 0.055, 0.58, -0.30)
    elif name == "defeat":
        for start, note, length in ((0.06, 75, 0.44), (0.40, 70, 0.48),
                                    (0.79, 67, 0.51), (1.23, 62, 0.73)):
            s.tone(start, length, midi(note), 0.13, ((1, 1), (2, 0.16), (3, 0.04)),
                   attack=0.055, release=0.19, decay=1.6, vibrato=0.0015, pan=-0.16)
            s.mallet(start + 0.01, note, 0.055, length + 0.10, 0.25)
        for i, note in enumerate((36, 43, 51)):
            s.horn(1.45, note, 0.97, 0.10, -0.3 + i * 0.3)
        s.noise(0.02, 0.7, 0.095, low=500, high=1700, decay=2, release=0.25)
        s.impact(1.47, 0.85, duration=0.44)
    elif name == "draw":
        for start, chord in ((0.04, (60, 65, 67)), (0.76, (57, 62, 67))):
            for i, note in enumerate(chord):
                s.tone(start, 0.91, midi(note), 0.09, ((1, 1), (2, 0.12), (3, 0.045)),
                       attack=0.10, release=0.30, decay=1.3, pan=-0.35 + i * 0.35)
                s.mallet(start + i * 0.025, note + 12, 0.045, 0.68, -0.25 + i * 0.25)
        s.mallet(1.22, 67, 0.075, 0.66)
    else:
        raise ValueError(name)
    s.room(0.10 if name in ("select", "melee", "projectile", "heavy") else 0.17, wide=True)
    return s.master()


def write_wav(path, left, right):
    pcm = array("h")
    for l, r in zip(left, right):
        pcm.extend((max(-32768, min(32767, round(l * 32767))),
                    max(-32768, min(32767, round(r * 32767)))))
    import sys
    if sys.byteorder != "little":
        pcm.byteswap()
    with wave.open(str(path), "wb") as target:
        target.setnchannels(2)
        target.setsampwidth(2)
        target.setframerate(RATE)
        target.writeframes(pcm.tobytes())


def encode_mp3(wav, mp3):
    subprocess.run(("ffmpeg", "-v", "error", "-nostdin", "-y", "-i", str(wav),
                    "-map_metadata", "-1", "-c:a", "libmp3lame", "-b:a", "128k",
                    "-ar", str(RATE), "-ac", "2", "-threads", "1",
                    "-id3v2_version", "0", "-write_id3v1", "0", str(mp3)), check=True)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def levels(samples):
    peak = max(abs(x) for x in samples)
    rms = math.sqrt(sum(x * x for x in samples) / len(samples))
    tail = samples[-round(0.030 * RATE) * 2:]
    tail_rms = math.sqrt(sum(x * x for x in tail) / len(tail))
    return {"peakDbfs": db(peak), "rmsDbfs": db(rms), "last30msRmsDbfs": db(tail_rms)}


def inspect(wav, mp3):
    with wave.open(str(wav), "rb") as source:
        if (source.getnchannels(), source.getsampwidth(), source.getframerate()) != (2, 2, RATE):
            raise ValueError(f"Unexpected master format: {wav}")
        samples = array("h", source.readframes(source.getnframes()))
        duration = source.getnframes() / RATE
    normalized = [x / 32768 for x in samples]
    decoded = subprocess.run(("ffmpeg", "-v", "error", "-nostdin", "-i", str(mp3),
                              "-f", "f32le", "-acodec", "pcm_f32le", "-"),
                             check=True, stdout=subprocess.PIPE).stdout
    mp3_samples = struct.unpack("<" + "f" * (len(decoded) // 4), decoded)
    master_levels, mp3_levels = levels(normalized), levels(mp3_samples)
    if master_levels["peakDbfs"] > -5.9 or mp3_levels["peakDbfs"] > -3:
        raise ValueError(f"Insufficient mix headroom: {wav}")
    if master_levels["rmsDbfs"] < -35 or mp3_levels["rmsDbfs"] < -35:
        raise ValueError(f"Empty or unexpectedly quiet cue: {wav}")
    if master_levels["last30msRmsDbfs"] > -70 or mp3_levels["last30msRmsDbfs"] > -60:
        raise ValueError(f"Non-silent endpoint: {wav}")
    decoded_duration = len(mp3_samples) / (2 * RATE)
    if abs(decoded_duration - duration) > 1 / RATE:
        raise ValueError(f"MP3 gapless duration mismatch: {mp3}")
    return duration, master_levels, mp3_levels


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verify", action="store_true", help="Validate saved files without replacing them")
    parser.add_argument("--check-determinism", action="store_true",
                        help="Regenerate in a temporary directory and compare every WAV/MP3 hash")
    args = parser.parse_args()
    if not shutil.which("ffmpeg"):
        raise SystemExit("ffmpeg with libmp3lame is required; no Python packages are needed.")
    for directory in (MASTERS, SOUNDS, DOCS):
        directory.mkdir(parents=True, exist_ok=True)
    manifest = {"version": 1, "sampleRate": RATE, "channels": 2, "masterBits": 16,
                "deliveryCodec": "mp3", "deliveryBitrate": 128000, "masterPeakDbfs": -6,
                "provenance": "Original local additive/noise DSP; no samples or model services",
                "reelGapSeconds": GAP, "cues": []}
    cursor = 0.35
    reel_left = array("d", [0.0]) * round(cursor * RATE)
    reel_right = array("d", [0.0]) * round(cursor * RATE)
    for name, duration, description in CUES:
        wav, mp3 = MASTERS / f"{name}.wav", SOUNDS / f"{name}.mp3"
        cue = None
        if not args.verify:
            cue = synthesize(name, duration)
            write_wav(wav, cue.left, cue.right)
            encode_mp3(wav, mp3)
        actual_duration, master_levels, mp3_levels = inspect(wav, mp3)
        if args.check_determinism:
            with tempfile.TemporaryDirectory(prefix="wickborn-audio-") as temporary:
                target = Path(temporary)
                candidate = synthesize(name, duration)
                write_wav(target / "cue.wav", candidate.left, candidate.right)
                encode_mp3(target / "cue.wav", target / "cue.mp3")
                if digest(wav) != digest(target / "cue.wav") or digest(mp3) != digest(target / "cue.mp3"):
                    raise ValueError(f"Nondeterministic regeneration: {name}")
        entry = {"name": name, "url": f"/game/sounds/{name}.mp3", "durationSeconds": round(actual_duration, 5),
                 "description": description, "master": f"art/audio/{name}.wav",
                 "masterLevels": master_levels, "deliveryLevels": mp3_levels,
                 "masterSha256": digest(wav), "deliverySha256": digest(mp3),
                 "deliveryBytes": mp3.stat().st_size, "reelStartSeconds": round(cursor, 2)}
        manifest["cues"].append(entry)
        print(f"{name:10} {actual_duration:4.2f}s | WAV peak {master_levels['peakDbfs']:6.2f} dBFS"
              f" | MP3 peak {mp3_levels['peakDbfs']:6.2f} dBFS | {mp3.stat().st_size:6,d} bytes")
        if not args.verify:
            reel_left.extend(cue.left)
            reel_right.extend(cue.right)
            silence = array("d", [0.0]) * round(GAP * RATE)
            reel_left.extend(silence)
            reel_right.extend(silence)
        cursor += duration + GAP
    if not args.verify:
        with tempfile.TemporaryDirectory(prefix="wickborn-reel-") as temporary:
            reel = Path(temporary) / "reel.wav"
            write_wav(reel, reel_left, reel_right)
            encode_mp3(reel, DOCS / "battle-audio-preview.mp3")
        (MASTERS / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
        # A small runtime manifest is useful for preloaders without distributing source hashes.
        runtime = {"version": 1, "format": "mp3", "sampleRate": RATE, "channels": 2,
                   "peakDbfs": -6, "cues": {x["name"]: {"url": x["url"], "durationSeconds": x["durationSeconds"]}
                                            for x in manifest["cues"]}}
        (SOUNDS / "manifest.json").write_text(json.dumps(runtime, indent=2) + "\n")
    preview = DOCS / "battle-audio-preview.mp3"
    reel_pcm = subprocess.run(("ffmpeg", "-v", "error", "-nostdin", "-i", str(preview),
                               "-f", "f32le", "-acodec", "pcm_f32le", "-"),
                              check=True, stdout=subprocess.PIPE).stdout
    reel_samples = struct.unpack("<" + "f" * (len(reel_pcm) // 4), reel_pcm)
    if abs(len(reel_samples) / (2 * RATE) - cursor) > 1 / RATE:
        raise ValueError("Preview reel duration does not match its documented cue timings")
    if levels(reel_samples)["peakDbfs"] > -3:
        raise ValueError("Preview reel has insufficient peak headroom")
    print(f"Verified {len(CUES)} cues; delivery total {sum(x['deliveryBytes'] for x in manifest['cues']):,} bytes.")
    print(f"Preview reel verified: {cursor:.2f}s, {preview.stat().st_size:,} bytes.")
    if args.check_determinism:
        print("All 13 WAV and 13 MP3 files matched independent regeneration byte for byte.")


if __name__ == "__main__":
    main()
