# Wickborn Arena — stock roster frontend update

This branch updates the GitHub checkout from `4fb4be4`. It changes presentation code, artwork and branding only. Backend API/market code, database/migrations, realtime authority, Solana programs, contract adapter, wallet transaction paths, deterministic engine, prediction/transport and shared staking rules are preserved.

## Roster and art

The 12 card IDs keep their existing decks, levels, combat values and staking amounts. `public/game/stock-roster.js` supplies frontend identities without replacing the server's protocol roster.

| ID | Stock token | Company | Fighter | Visual identity |
|---|---|---|---|---|
| 0 | AAPLx | Apple | Orchardhorn | Green bull, pearl armor, copper leaf shield |
| 1 | TSLAx | Tesla | Voltrunner | Charcoal fox, red lightning tail, battery coils |
| 2 | MSFTx | Microsoft | Cloudback | Navy tortoise, cloud-cube fortress shell |
| 3 | GOOGLx | Alphabet | Lensfin | Blue penguin, brass lens and red scarf |
| 4 | AMZNx | Amazon | Parcelpack | Three courier gliders with cardboard parcels |
| 5 | NVDAx | NVIDIA | Tensorforge | Emerald processor golem and copper claws |
| 6 | JNJx | Johnson & Johnson | Vitalbloom | Ivory-coated frog healer and coral lily staff |
| 7 | METAx | Meta | Portalwyrm | Indigo dragon, blue portal wings |
| 8 | JPMx | JPMorgan Chase | Vaultguard | Navy rhino, brass vault armor |
| 9 | NFLXx | Netflix | Reelmoth | Crimson film-ribbon moth |
| 10 | MCDx | McDonald's | Frydrop | Golden slime, red wrap and fry crown |
| 11 | HOODx | Robinhood | Hoodwing | Jade owl, cream facial disc, archer hood |

Stock products were researched against the issuer's product pages on 2026-10-17. Each entry links to its issuer reference. These are fantasy game representations; this branch does not introduce securities purchases, token custody or issuer sponsorship. No mint addresses are invented or substituted into the existing game-token contract flow.

- Issuer directory: https://assets.backed.fi/products
- xStocks documentation: https://docs.xstocks.fi/docs
- Every `productUrl` in `stock-roster.js` points to the corresponding issuer product page.

`public/game/characters/` contains twelve individual 512×512 transparent portraits. `sprite-art.js` supplies the same assets to collection cards, hand, deck, modals, results, profile and the 2D fallback. Every silhouette has at least 40 transparent pixels of padding on each side. The regenerated `public/game/stock-creatures.png` is a padded 2048×1536 export (four columns, three rows), retained for review and downloads; runtime views no longer crop it. See `2D-ART.md` for the generation brief and isolation fix. All 12 3D models retain their matching identities, colors and landmarks. `public/brand/wickborn-bull.png` reuses the simpler bull mascot created for Wickborn; the favicon has a compact SVG bull variant.

## Artwork provenance

The active artwork uses twelve separate 3D-style raster portraits generated with the built-in image-generation tool and the selected bull as a rendering-style reference. Transparent masters are checked in under `art/portraits/`; production PNG/WebP pairs retain the complete silhouette. Both lobbies use the same 3D-style arena landscape and ivory/cobalt interface. See [2D-ART.md](2D-ART.md) and [the art brief/prompt set](ILLUSTRATED-ART-PROMPTS.md).

The preceding flat vector portraits and their two SVG landscapes remain archived but are not used by the active cards or lobby. Earlier stock/crypto atlases are historical assets. The existing vector bull mark remains the site logo.

## Sculpted 3D revision

The twelve fighter designs now live in `public/game/three/fighters.js`. `anatomy.js` builds continuous anatomical sections, tapered ridged feathers/fur, corner-bevelled armor and cambered solid membranes. `models.js` retains template instancing, independent reaction materials and combat/movement animation. Major bodies, heads, muzzles, limbs, coats and accessories use designed mesh contours instead of assembled primitive spheres and boxes. The tortoise intentionally retains the cloud cubes from its reference; small eye surfaces and decorative hardware reuse shared primitive geometry.

The fox has a tapered snout, tall pinnae and sculpted red tail; the bull has swept horns, shaped pearl armor and a leaf shield; the golem has contoured processor plates, a visor and curved copper claws. The dragon, gliders and moth have curved solid wings with actual animated distal geometry. The owl has a shaped facial disc, hood and layered feathers. Front patches follow the underlying torso sections to prevent intersecting chest surfaces. Wing rest poses are initialized before health-label bounds are measured. Inward-wound legacy curve faces are corrected and capped so horns and tubes work with single-sided materials.

Geometry is baked by material within each animated joint and shared across instances. Rendering budgets remain below 56 meshes and 36,000 triangles per fighter, including silhouette meshes; the most detailed fighter currently uses 54 meshes and 35,532 triangles. These are geometry budgets, not a measured device frame-rate guarantee.

`docs/sculpted-fighters-preview.png` projects the actual new geometry with offline lighting. It is a review aid, not a browser screenshot or an exact reproduction of the game's WebGL lighting. The illustrations and procedural sculptures share creature identities and visual landmarks; they are stylized interpretations rather than an exact illustration-to-3D conversion. The older geometry preview predates the current arena palette and lighting.

## Natural action revision

The latest revision reduces the toy-like proportions and movement. Quadruped heads sit farther forward and closer to their shoulders. Heads are smaller relative to the body, limbs flow more broadly into the shoulders and hips, and the eyes use shallow almond surfaces with individual lids instead of protruding spherical sclera. Owls and frogs retain rounder eyes appropriate to their anatomy. Outline expansion is reduced from 1.8% to 0.8%.

`surfaces.js` builds a shared library of deterministic 128×128 bump and roughness maps for fur, hide, woven cloth and brushed metal. The library initializes on demand and is disposed with the renderer kit; fighter instances share maps while keeping independent hit/reaction materials. No new image downloads or packages are needed. These maps are part of the WebGL materials; the offline previews show geometry and approximate lighting without the surface maps.

`locomotion.js` defines separate walking, trotting, biped and flight rhythms. Supporting feet counteract forward travel during their stance phase, and the swing trajectory has continuous velocity at liftoff and touchdown. New ankle joints keep the feet level. The leg solver counteracts torso lean and breathing in the root frame; straight-walking support targets are checked within 0.003 model units across the seven ground fighters. Turning banks the body, leads with the head and trails with the tail. This is cosmetic animation and does not alter engine positions, attack ranges or the network state.

Attacks now use smaller, grounded weight shifts with different anticipation, contact and recovery poses. Heavy golem and rhino attacks recover over 0.76 seconds. Existing melee contact at 0.20 seconds, caster pose peak at 0.15 seconds, projectile visibility delay at 0.12 seconds and ranged impact at 0.38 seconds remain unchanged. Solid fighters retain their volume during attacks and market reactions; only the slime squashes, preserving its total scale volume. Market cheers lift the body without a full-body spin. Wings have a faster power stroke and delayed tip motion; ears and the scarf follow the movement, and tails turn around their attachment point. Hit reactions and hover movement are more restrained.

`docs/natural-motion-preview.mp4` is a four-second offline render of the actual updated game rigs: walking, combat stance and two attacks across eight representative fighters. It does not include a live battle, game UI, surface-map shading or device-performance measurements.

## Price integration boundary

The requested scope explicitly excludes backend changes. The existing `lib/market.js` still maps crypto references and a separate NVDA underlying-stock quote. Replacing its frontend labels would falsely label BTC prices as AAPLx prices. Instead, `stock-market.js` accepts only identifiable matching stock quotes, rejects crypto data, and distinguishes an underlying-share reference from a token quote.

Free practice renders the stock roster immediately. Unmapped quotes stay neutral. The existing NVDA underlying quote can identify NVDAx's underlying reference; it is labeled as an underlying stock, not a token trade. New funded stock matches require matching live stock quotes for all eight selected IDs, before any escrow preparation. Existing positions, pending confirmations, refunds, withdrawals, reconnect and settlement recovery remain accessible.

The backend owner must map the new stock references before new stock-priced token matches can start. This branch deliberately does not change that backend. Expected quote rows use `symbol` (e.g. `AAPLx`), positive finite `price`, `publishTime` in epoch seconds, `feedId`, and `status:'live'`. Underlying rows must explicitly identify their stock (e.g. `NVDA` with `feedId:'yahoo:NVDA'`). The adapter maps response order by symbol to the fixed card IDs. Set the server's actual roster/price authority to the same mapping before enabling play; client-only checks are not a server migration.

The WICKB brand appears throughout the UI. Transaction review continues to use the mint, decimals, program and token symbol returned by the owner's existing runtime configuration. This change does not rename or redeploy a mint or program.

## Validation

166 tests passed after the shared palette and illustrated-art revision, including the existing stock, sculpted-geometry, natural-motion and sprite-isolation checks. TypeScript passed. The production build passed. Run `node --test tests/*.test.mjs` and `node node_modules/typescript/bin/tsc --noEmit --incremental false`. `stock-frontend.test.mjs` checks stock-only presentation, stable IDs/stats/staking, quote identity, readiness and authoritative-state isolation. Existing model tests check geometry, joints, camera framing, draw budgets, market emotions and disposal. `sculpted-fighters.test.mjs` adds outward face winding, flush skin regions, feather orientation, articulated wingtip geometry, rest bounds and finite combat/reaction poses. `natural-motion.test.mjs` checks stance and swing continuity, actual ankle support, volume-preserving reactions, inset eyes, shared texture cleanup, impact timing and independent secondary joints. `sprite-art.test.mjs` decodes the actual PNG alpha pixels to verify padding, checks exported atlas gutters, and tests whole-image rendering in both cards and the 2D canvas.

Browser/GPU inspection was unavailable in this authoring environment. Numerical model checks and a projection contact sheet are separate from actual device playtesting. No backend, smart contract or production deployment is performed by this frontend branch.
