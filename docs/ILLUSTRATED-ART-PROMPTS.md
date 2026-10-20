# 3D-style card artwork: prompts and sources

Date: 2026-10-19. Mode: **built-in `image_gen.imagegen`**. The selected images are generated raster artwork with a 3D rendering style. They are not new game meshes or exports of the existing procedural rigs.

The complete final prompt set, saved master paths, transparency settings and reference roles are checked in at [art/card-art-prompts.json](../art/card-art-prompts.json). That JSON records the actual selected prompts. Discarded variants are not active assets.

## Shared brief

Use smooth broad sculpted shapes, simplified modeled details, restrained satin surfaces, neutral studio light and soft ambient occlusion. Choose strong saturated local colors and a clear three-quarter pose. Preserve the fighter's species and signature equipment. Keep the whole body, horns, wings, feet and tail in view on transparent alpha. Remove ornate engraving, fine fur strokes, painted contours, cinematic haze and decorative particles from the art direction. Images must read at small card sizes.

The first selected green bull was generated without an image reference. It then served only as a **rendering-style reference** for the other eleven species. Its horns, shield and leaf accessories were not requested on the other fighters. The final fox uses a simplified scout prompt following an unsuccessful initial generation.

## Roster and saved masters

| ID | Master | Identity and main colors |
| --- | --- | --- |
| 0 | `art/portraits/aaplx.png` | Green bull, ivory horns/armor, copper leaf shield |
| 1 | `art/portraits/tslax.png` | Charcoal fox, scarlet lightning-shaped tail, silver packs |
| 2 | `art/portraits/msftx.png` | Royal-blue tortoise, ivory body panels, three blue cloud towers |
| 3 | `art/portraits/googlx.png` | Blue/ivory penguin, red scarf, brass lens and telescope |
| 4 | `art/portraits/amznx.png` | Exactly three orange courier gliders with teal membranes and parcels |
| 5 | `art/portraits/nvdax.png` | Lime/emerald processor golem, copper pins and claws, mint visor |
| 6 | `art/portraits/jnjx.png` | Green frog healer, ivory/coral coat and lily staff |
| 7 | `art/portraits/metax.png` | Indigo/lilac dragon, cyan membranes and solid portal ring |
| 8 | `art/portraits/jpmx.png` | Navy rhino, one ivory nose horn, brass vault armor |
| 9 | `art/portraits/nflxx.png` | Charcoal moth, four red film-strip wings and ivory reel details |
| 10 | `art/portraits/mcdx.png` | Yellow slime, red paper wrap and five-fry crown |
| 11 | `art/portraits/hoodx.png` | Jade owl ranger, cream facial disc, green hood and quiver |

## Arena

`art/arena-crossing.png` depicts a clean stylized 3D battle island in daylight: one horizontal blue river, two wooden bridges, three blue near-side towers and three coral far-side towers, green turf, ivory stone, simple trees and a pale blue sky. It has an opaque background. Both game versions consume `public/game/backgrounds/arena-crossing.webp`.

## Reference direction

The user supplied the Colors! 3D promotional image and these links as a palette/mood reference:

- [Pure Nintendo reference](https://purenintendo.com/mini-review-crollors-game-pack-nintendo-3ds/)
- [Colors!](https://en.wikipedia.org/wiki/Colors!)
- [Colors Live information](https://www.colorslive.com/info)
- [Provided gallery link](https://www.colorslive.com/artist/gallery/followers), which did not load in the research tool

The resulting direction uses brighter surfaces, stronger primary colors and simpler forms. The exact runtime palette is defined in `public/game/art-direction.js`; reference pages do not provide game assets or dependencies.
