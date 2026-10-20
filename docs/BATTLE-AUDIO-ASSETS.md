# Original battle audio

The 13 Wickborn cues are original local digital synthesis. They use layered,
filtered noise for air, impacts and debris, additive oscillators for metal and
glass, and newly composed musical phrases for the match results. No recordings,
downloaded samples, stock music, sound banks, voices or external generation
services are included. The complete sound design is reproducible from
`scripts/generate-battle-audio.py`.

The victory cue is a short C-major call-and-response fanfare with warm synthesized
brass, mallet doubling, low percussion and a final open major chord. The defeat
cue is a quieter descending minor phrase with a low closing chord. Draw uses
unresolved suspended chords. Combat cues combine air, low body and material
resonance instead of single pure-tone beeps. Short filtered reflections give
space without a long reverb tail.

## Files and timings

All WAV masters are stereo 44.1 kHz, signed 16-bit PCM. Delivery files are stereo
44.1 kHz MP3 at 128 kbps. The individual MP3 files total **315,123 bytes**; the WAV
masters total **3,325,712 bytes**. Keep masters for future editing and serve the
MP3 files to browsers.

Listen to `docs/battle-audio-preview.mp3` for the full **26.35-second** reel. It
starts with 0.35 seconds of silence and separates the cues with 0.55 seconds of
silence. There are no spoken labels; the table supplies the cue labels and exact
start positions.

| Cue | Duration | Reel start | Sound |
| --- | ---: | ---: | --- |
| `select` | 0.24 s | 0.35 s | Soft wooden tick and a small glass overtone |
| `deploy` | 0.78 s | 1.14 s | Air rush, earth landing and a warm confirmation chime |
| `melee` | 0.49 s | 2.47 s | Directional swing, padded hit and a small metal ring |
| `heavy` | 0.90 s | 3.51 s | Low impact, debris and a muted armor resonance |
| `projectile` | 0.62 s | 4.96 s | Fast air flick and a traveling whistle |
| `magic` | 1.08 s | 6.13 s | Electrical wind and an inharmonic crystalline bloom |
| `heal` | 1.22 s | 7.76 s | Rising glass and mallet notes with an airy shimmer |
| `tower` | 1.36 s | 9.53 s | Staggered stone impacts, rubble and a settling rumble |
| `capture` | 1.40 s | 11.44 s | Ascending mallet confirmation and a bright chord |
| `ultimate` | 1.98 s | 13.39 s | Energy intake, deep impact and a wide magical release |
| `victory` | 3.75 s | 15.92 s | Original major fanfare with brass, mallets and percussion |
| `defeat` | 2.85 s | 20.22 s | Restrained descending minor phrase and low chord |
| `draw` | 2.18 s | 23.62 s | Two suspended chords and a soft closing mallet |

Source and delivery paths follow the cue names:

- `art/audio/<cue>.wav`: editable lossless master.
- `public/game/sounds/<cue>.mp3`: browser delivery asset.
- `art/audio/manifest.json`: source hashes, delivery hashes, exact durations,
  RMS/peak levels and reel timestamps.
- `public/game/sounds/manifest.json`: compact runtime URLs and durations.

## Rebuild and verify

Requires Python 3.10 or newer and `ffmpeg` with its `libmp3lame` encoder. It uses
Python's standard library only. Nothing is installed or fetched by the script.
From the repository root:

```sh
python3 scripts/generate-battle-audio.py
python3 scripts/generate-battle-audio.py --verify --check-determinism
```

The first command replaces the WAVs, MP3s, manifests and reel. The second leaves
the saved files unchanged, verifies their formats and decoded levels, then
independently regenerates each cue in a temporary directory and compares every
WAV and MP3 SHA-256. Seed values derive from each cue's name. In the verified
environment (Python 3.12.14, ffmpeg 6.1.1), all **26 individual audio files**
matched regeneration byte for byte. Different Python math libraries or MP3
encoder builds can produce different final bytes; use the same tool versions
when exact hash reproduction matters.

## Mix headroom and validation

Each WAV reaches **−6.00 dBFS sample peak**, leaving headroom for the game mixer.
Decoded MP3 sample peaks range from **−6.73 to −5.11 dBFS**, and their full-file
RMS levels range from **−28.04 to −20.96 dBFS**. These are peak/RMS measurements,
not a claim of broadcast loudness normalization or an oversampled true-peak
measurement. The final 35 ms of each master are silent after a smooth 85 ms
fade; every decoded MP3's final 30 ms measures below −60 dBFS RMS. No individual
file clips, and each MP3 decodes to the exact source duration through its gapless
metadata. The reel's decoded duration and peak are checked too.

Use conservative voice gains and a limiter or master compressor for overlapping
hits; multiple individually safe sources can still sum above full scale. Result
cues should interrupt the combat mix, and all sounds should respect the player's
sound setting and the browser's user-gesture audio rules. Playback routing is
separate from this asset generator.

Verification covers the encoded files and signal properties. Browser playback,
mix balance during a match and speaker/headphone listening checks remain part of
the frontend integration review.
