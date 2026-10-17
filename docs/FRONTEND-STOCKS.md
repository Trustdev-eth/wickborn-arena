# Wickborn Arena — stock roster frontend update

This branch updates the GitHub checkout from `4fb4be4`. It changes presentation code, artwork and branding only. Backend API/market code, database/migrations, realtime authority, Solana programs, contract adapter, wallet transaction paths, deterministic engine, prediction/transport and shared staking rules are preserved.

## Roster and art

The 12 card IDs keep their existing decks, levels, combat values and staking amounts. `public/game/stock-roster.js` supplies frontend identities without replacing the server's protocol roster.

| ID | Stock token | Company | Fighter | Visual identity |
|---|---|---|---|---|
| 0 | AAPLx | Apple | Orchardhorn | Mint bull, pearl armor, copper leaf shield |
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

`public/game/stock-creatures.png` is a new original 1448×1086 RGBA atlas (four columns, three rows). It is used by the collection, hand, deck, modals, results, profile and 2D fallback. All 12 3D models have matching silhouettes, colors and landmarks. Existing expressive market reactions, reduced motion, animation timing and resource disposal remain intact. `public/brand/wickborn-bull.png` reuses the simpler bull mascot created for Wickborn; the favicon has a compact SVG bull variant.

## Artwork provenance

The new stock atlas was generated with the built-in image-generation tool. Generation brief: one transparent 4-column × 3-row atlas, exactly twelve full-body fantasy fighters in the order above, crisp charcoal outlines, limited flat colors, simple cel shadows, distinct silhouettes, no text or corporate logos. Each cell follows the palette, anatomy and accessories specified in the roster table; courier gliders occupy one cell as a group of three. The bull logo reuses the later flat mascot image from the naming/design conversation.

## Sculpted 3D revision

The twelve fighter designs now live in `public/game/three/fighters.js`. `anatomy.js` builds continuous anatomical sections, tapered ridged feathers/fur, corner-bevelled armor and cambered solid membranes. `models.js` retains template instancing, independent reaction materials and combat/movement animation. Major bodies, heads, muzzles, limbs, coats and accessories use designed mesh contours instead of assembled primitive spheres and boxes. The tortoise intentionally retains the cloud cubes from its reference; small eye surfaces and decorative hardware reuse shared primitive geometry.

The fox has a tapered snout, tall pinnae and sculpted red tail; the bull has swept horns, shaped pearl armor and a leaf shield; the golem has contoured processor plates, a visor and curved copper claws. The dragon, gliders and moth have curved solid wings with actual animated distal geometry. The owl has a shaped facial disc, hood and layered feathers. Front patches follow the underlying torso sections to prevent intersecting chest surfaces. Wing rest poses are initialized before health-label bounds are measured. Inward-wound legacy curve faces are corrected and capped so horns and tubes work with single-sided materials.

Geometry is baked by material within each animated joint and shared across instances. Rendering budgets remain below 56 meshes and 36,000 triangles per fighter, including silhouette meshes; the most detailed fighter currently uses 49 meshes and 35,660 triangles. These are geometry budgets, not a measured device frame-rate guarantee.

`docs/sculpted-fighters-preview.png` projects the actual new geometry with offline lighting. It is a review aid, not a browser screenshot or an exact reproduction of the game's WebGL lighting. The atlas is the design reference; the procedural sculptures are a stylized interpretation rather than a claim of exact illustration-to-3D conversion.

## Price integration boundary

The requested scope explicitly excludes backend changes. The existing `lib/market.js` still maps crypto references and a separate NVDA underlying-stock quote. Replacing its frontend labels would falsely label BTC prices as AAPLx prices. Instead, `stock-market.js` accepts only identifiable matching stock quotes, rejects crypto data, and distinguishes an underlying-share reference from a token quote.

Free practice renders the stock roster immediately. Unmapped quotes stay neutral. The existing NVDA underlying quote can identify NVDAx's underlying reference; it is labeled as an underlying stock, not a token trade. New funded stock matches require matching live stock quotes for all eight selected IDs, before any escrow preparation. Existing positions, pending confirmations, refunds, withdrawals, reconnect and settlement recovery remain accessible.

The backend owner must map the new stock references before new stock-priced token matches can start. This branch deliberately does not change that backend. Expected quote rows use `symbol` (e.g. `AAPLx`), positive finite `price`, `publishTime` in epoch seconds, `feedId`, and `status:'live'`. Underlying rows must explicitly identify their stock (e.g. `NVDA` with `feedId:'yahoo:NVDA'`). The adapter maps response order by symbol to the fixed card IDs. Set the server's actual roster/price authority to the same mapping before enabling play; client-only checks are not a server migration.

The WICKB brand appears throughout the UI. Transaction review continues to use the mint, decimals, program and token symbol returned by the owner's existing runtime configuration. This change does not rename or redeploy a mint or program.

## Validation

109 tests passed, including the seven stock frontend checks and five sculpted-geometry checks. TypeScript passed. The production build passed. Run `node --test tests/*.test.mjs` and `node node_modules/typescript/bin/tsc --noEmit --incremental false`. `stock-frontend.test.mjs` checks stock-only presentation, stable IDs/stats/staking, quote identity, readiness and authoritative-state isolation. Existing model tests check the rebuilt geometry, joints, camera framing, draw budgets, market emotions and disposal. `sculpted-fighters.test.mjs` adds outward face winding, flush skin regions, feather orientation, articulated wingtip geometry, rest bounds and finite full combat/reaction poses.

Browser/GPU inspection was unavailable in this authoring environment. Numerical model checks and a projection contact sheet are separate from actual device playtesting. No backend, smart contract or production deployment is performed by this frontend branch.
