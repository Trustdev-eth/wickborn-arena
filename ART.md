# Wickborn Arena art

The active frontend roster contains twelve stock-token fantasy fighters. Their transparent 3D-style raster masters live in `art/portraits/`, with complete padded PNG/WebP exports in `public/game/characters/`. Both game versions use the landscape master `art/arena-crossing.png` through its optimized WebP export.

- [Active artwork, palette and export guide](docs/2D-ART.md)
- [Built-in image-generation mode, art brief and subject prompt set](docs/ILLUSTRATED-ART-PROMPTS.md)
- [Stock roster identities and frontend integration boundary](docs/FRONTEND-STOCKS.md)
- [Current fighter review sheet](docs/console-fighters-preview.png)
- [Current landscape review](docs/console-arena-preview.png)

The 3D fighter rigs are stylized procedural models. This revision changes the card artwork, interface colors and shared arena palette, while retaining the existing 3D geometry and movement. The generated card portraits depict the same identities and accessories but are not renders of the actual game meshes. Browser/GPU appearance remains unverified in this environment.

Older crypto atlases, SVG portraits, arena SVGs and their provenance remain in the repository or Git history as historical assets. `docs/TOKEN-ART-PROMPT.md` describes the earlier crypto artwork; it is not the active stock roster. The live UI does not crop those old atlases.
