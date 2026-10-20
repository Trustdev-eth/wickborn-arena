# Live arena, fighter geometry and original audio

Frontend revision, 2026-10-19. The approved card portraits and arena illustration
remain unchanged. The live meshes follow their colors and signature equipment,
but are manually authored approximations, not a 100% reconstruction of the images.

## World and interface

`app/world-theme.css` layers a deep blue backdrop over the existing arena panorama,
with cream text, sky blue highlights, gold play controls and slate-blue panels.
The same world surrounds the lobby, Fighters, Upgrades, Rankings and Skirmish.
Battle HUDs use dark blue controls with light labels; cards keep their existing
portraits with subtle fighter-colored tints over the blue surface. Dialogs,
collection details, upgrade panels and rankings share the same content tokens.
The header and favicon use the new hand-authored vector W/arena crest in navy, ivory and
gold. Existing layout/dock breakpoints remain. The 2026-10-19 palette follow-up
does not change the background image, its overlay, avatars, 3D scene or audio.

`public/game/three/landscape.js` builds a real mesh scene: a rocky island,
separate grass banks, an exposed animated blue river, two timber bridges,
cylindrical cream towers, tiered colored roofs, arched entries, flags, paved
lanes, clumped trees, layered pines, flowers, distant terrain and clouds. Static
repeated scenery is instanced. Shared geometry belongs to the rendering kit;
per-scene water/grass buffers, instance buffers and materials are disposed with
their owners. Bridge deck tops remain at the existing 0.12-unit walking height.
The lower camera angle shows more of the faces and tower architecture while
retaining the full playable board in the tested aspect ratios.

## Fighter changes

All twelve live rigs retain their IDs, joints and combat timelines. Revisions
include broader faces and clearer eyes, stronger colors and softer surface
roughness. The bull has a round leaf shield; the fox has silver battery packs;
the tortoise has three cloud fortresses; the penguin carries a brass telescope;
each deployed courier is one glider with a curled tail; the golem has a single
visor and two copper claws per hand; the frog has a coral coat and lily staff;
the dragon has ivory horns and one solid portal ring; the rhino has round vault
wheels; the moth has charcoal/red coloring and ivory film marks; the slime has
five fries; the owl carries a quiver. Engine motion, attacks and market reactions
continue to drive the rigs. The existing 56-mesh / 36,000-triangle per-rig limits
remain enforced, and geometry templates remain shared across instances.

## Audio

No Runway account, API key, downloaded samples or external sound service is used
by the delivered assets. The 13 clips are original reproducible local DSP sound
design. See [BATTLE-AUDIO-ASSETS.md](BATTLE-AUDIO-ASSETS.md) for the generator,
provenance, cue order, durations and measured file levels.

`public/game/battle-audio.js` provides the shared Classic/Skirmish player. It
activates after a user gesture and loads the local MP3 bank (315 KB total).
Melee/heavy transient offsets are aligned with the renderer's existing contact
timeline. Different cues cover ranged attacks, spells, healing, deployment,
tower destruction, relay capture, ultimate abilities, victory, defeat and draw.
Stereo panning follows horizontal arena position. Per-cue rate limits, eight
active combat voices, a compressor and conservative gains control the mix.
Result cues stop the combat mix. Mute, pause, hidden tabs, new matches and disposal
stop scheduled sounds; repeated snapshots and old reconnect events are discarded.
If clips fail to load, lightweight synthesized feedback remains available.
The player only reads presentation events and tower HP; it never changes them.

The WAV masters have headroom and the encoded files decode successfully. These
signal checks do not establish headphone/speaker mix quality in a browser.

## Review and editor files

- `docs/live-fighters-review.png`: all twelve actual live meshes, labeled.
- `docs/live-arena-review.png`: actual environment/tower/fighter geometry.
- `docs/battle-audio-preview.mp3`: all 13 cues in documented order.
- `art/models/*.glb`: twelve portable fighter exports, each with baked idle,
  walk and attack channels, plus the arena scene. These mirror the procedural
  hierarchy and are editor handoff files; the game continues using its live rigs.
- `art/models/manifest.json`: exported sizes and SHA-256 hashes.

The PNGs are CPU renders of the real geometry with approximate vertex lighting.
They are explicitly not browser screenshots or a claim to reproduce WebGL PBR
lighting, textures or shadows. The portable GLBs include base colors and vertex
shading, but omit the runtime grain maps and silhouette pass. Baked motion is
sampled at 20 fps from the current part-based rig, not a newly skinned DCC rig.

Regenerate from the repository root:

```sh
node scripts/export-palette.mjs
python scripts/generate-battle-audio.py
node scripts/render-3d-review.mjs
node scripts/export-3d-assets.mjs
```

Audio generation uses Python and ffmpeg. Review image encoding/labels use Python
and Pillow. Geometry/export scripts use the installed Three dependency.

## Verification boundary

Automated checks cover geometry, contact timing, finite poses, camera framing and
ray picking, shared-resource ownership, river/bridge surfaces, sound lifecycle,
event deduplication, bounded polyphony, encoded asset headroom, and loading the
GLBs back into Three to compare bounds and animation channels. TypeScript and
the production build are checked separately.

No supported browser-control skill was available, so no substitute browser or
preview server was started. Actual WebGL appearance, responsive layouts on real
devices, sound balance while playing, mobile frame rate and a two-person hosted
match still need browser/device playtesting. No performance or exact visual-match
guarantee follows from the offline renders or automated tests.

Backend, contracts, database, gameplay engines, price logic, escrow and networking
are unchanged from `3515961`. No production publish, deployment or GitHub push
is part of this local frontend update.
