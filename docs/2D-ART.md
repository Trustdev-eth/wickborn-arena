# Wickborn card art and color system

Updated 2026-10-19; current revision follows `e6d0532`. The active cards use twelve generated **3D-style raster portraits** with broad sculpted forms, saturated local colors and simpler materials. The site now uses an ivory-and-cobalt palette with sunny yellow, coral and green accents. This replaces the earlier dark teal interface and detailed painted portraits.

## Active assets

| Path | Purpose |
| --- | --- |
| `art/portraits/*.png` | Twelve transparent master portraits |
| `art/arena-crossing.png` | Shared 3D-style arena landscape master |
| `art/card-art-prompts.json` | Exact selected prompts, reference roles and generation mode |
| `public/game/characters/*.png` | Twelve complete 512×512 RGBA portraits |
| `public/game/characters/*.webp` | Optimized equivalents selected by CSS |
| `public/game/characters/manifest.json` | IDs, source bounds, source type, edge checks and export paths |
| `public/game/backgrounds/arena-crossing.webp` | Both lobby versions use the same landscape |
| `public/game/stock-creatures.png` | 2048×1536 review atlas; not sampled by runtime cards |
| `docs/console-fighters-preview.png` | Current card-art review sheet |
| `docs/console-arena-preview.png` | Current landscape review |

All twelve portraits are separate images. Parcelpack is its own group of three couriers. No runtime card or canvas renderer extracts a neighboring atlas cell. Exports fit the entire alpha silhouette into a 432×432 safe area on a transparent 512×512 canvas, leaving at least 40 clear pixels on each side. The exporter also rejects source images with opaque pixels touching the outer two-pixel edge. All twelve selected masters pass that check.

The twelve PNG fallbacks total **2,629,425 bytes**. The twelve optimized WebPs total **509,138 bytes**; the shared landscape WebP is **264,420 bytes**. Full-resolution masters are source files, not frontend downloads.

## Color and presentation

`public/game/art-direction.js` is the canonical palette. `scripts/export-palette.mjs` writes the matching CSS variables to `app/palette.css`. `app/world-theme.css` scopes the `content-*` tokens to panels, dialogs and toasts: slate-blue surfaces, ivory text, pale blue actions and gold accents. Menus, collection details, upgrades, rankings, account, results, Classic controls and Skirmish controls share those values. Cards use a subtle fighter-color tint over blue and retain their colored top edge; cost badges use yellow with dark navy text. Positive and negative market information keep separate green and red text. Background and portrait files are unchanged by the palette update. The hand-authored SVG arena crest and matching PNG review are in `public/brand/wickborn-mark.svg` and `docs/wickborn-crest-preview.png`.

The battle renderer and 2D fallback import the same arena palette. Sky and distant background are now light blue/ivory, with blue water, green turf, ivory stone and blue/coral towers. Existing 3D fighter meshes, animation, camera and simulation remain unchanged. The new card images depict the same creature identities and major accessories, but are generated raster artwork rather than exports of the game's actual procedural meshes.

The palette's checked text pairs have contrast ratios of 12:1 for body text, 6.03:1 for secondary text, 6.04:1 for primary buttons, 9.01:1 for cost badges, 5.83:1 for positive text and 5.19:1 for negative text. These are checks of the specified color pairs, not a full browser accessibility audit.

## Re-export

Run these commands in the full project checkout with its locked dependencies installed:

```sh
node scripts/export-illustrated-art.mjs
node scripts/export-palette.mjs
```

The artwork exporter uses Sharp from the existing locked dependency tree. It frames and formats the saved masters without generating new artwork. PNG/WebP pairs, the manifest, review atlas, landscape export and review sheets are reproducible from the checked-in masters. Image generation itself is nondeterministic; the selected masters preserve the actual results.

`docs/console-fighters-preview.png` is a direct asset layout with roster names and game costs, not a browser screenshot. Older `fantasy-*` and `arcade-*` review sheets describe earlier revisions. Archived vector portraits and landscapes are inactive. The legacy vector exporter requires `--legacy-vector` before replacing the current raster roster.

## Provenance and scope

The built-in `image_gen.imagegen` tool generated the selected portraits and landscape. The first selected bull established the rendering style for the other eleven; the landscape was generated separately. See [the prompt guide](ILLUSTRATED-ART-PROMPTS.md) and exact JSON prompt set. The style targets clean console-game renders rather than detailed painted fantasy key art. The artwork is not described as human-authored.

Backend services, smart contracts, database/migrations, market rules, combat engines, transport and prediction are unchanged. Browser/GPU and physical-device visual testing were unavailable in this managed environment. The exported artwork sheets were visually reviewed; frontend validation is recorded in [UI-REDESIGN.md](UI-REDESIGN.md).
