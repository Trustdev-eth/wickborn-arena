# Wickborn Arena frontend redesign

Updated 2026-10-19. The current art/palette revision builds on `e6d0532`, following the earlier UI flow redesign. Backend services, contracts, database/migrations, deterministic gameplay engines, Classic price rules, prediction, transport and wire serialization are preserved.

## Player journey

1. Arrive at **Play**. The first screen identifies a 3D stock-creature tower battle and states the central-tower win condition.
2. Choose **Classic** or **Skirmish**. Each has a short explanation of how its controls differ.
3. Choose **Practice** or **Online battle**, then use the single primary launch button. Practice requires no wallet and does not wait for an account or network request.
4. Customize the eight-fighter deck when desired. Classic uses Fighters; Skirmish opens a dedicated captain-and-squad editor with optional specializations collapsed by default.
5. Enter a focused battle view. Timer, arena, hand and elixir stay in the battle frame. Skirmish adds captain health, abilities and relay information.

The primary navigation has four destinations: Play, Fighters, Upgrades and Rankings. Account and wallet tasks remain in the header and the mobile Trainer destination. There is no automatic account popup on first arrival. Existing token balances, staking, refunds, transaction review and settlement screens remain accessible.

Boss Hunt and Campaign no longer have UI entry points. Their old pure simulation/progression code and regression tests remain in the repository so this frontend revision does not alter shared gameplay modules. They are not advertised as playable product modes.

## Presentation

- One shared ivory/cobalt palette with yellow, coral and green accents, subtly tinted fighter-art areas, blue/coral teams, clear borders and selected states.
- Consistent buttons, cards, borders and dialog surfaces across every destination, including wallet and result dialogs.
- Twelve individually generated 3D-style portraits, complete padded PNG/WebP pairs, and one shared 3D-style arena landscape. The existing vector bull mark is retained. Runtime rendering contains the complete image instead of sampling an atlas cell. Art provenance and prompts are documented.
- Desktop lobby pairs arena artwork with a compact play panel. Mobile presents the play panel before decorative artwork. Practice launches before optional AI difficulty controls.
- During matches the global navigation is hidden, making room for the arena, timer and controls. Classic keeps its automatic side/bottom arrangement with a wider 188px desktop dock and larger bottom-dock portraits; Skirmish has a compact mobile HUD and a side dock for short landscape screens.
- Keyboard controls, visible focus, dialog focus containment, reduced motion and safe-area spacing are retained.

## Online boundary

Classic uses the existing authenticated wallet, WICKB entry, escrow review, match ticket and settlement flow. This change does not enable contracts, replace the market feed or alter payouts. Availability continues to follow the existing runtime/stock-feed guards.

The current backend does not advertise or serve the Skirmish ruleset. The UI therefore labels Skirmish online **Online coming soon**, offers free practice, and sends no Skirmish requests to Classic funding endpoints.

The new frontend transport handles a separately negotiated `wickborn-tactics/1` protocol, full authoritative snapshots, side-1 input mirroring, ordered interpolation, command acknowledgements, reconnect tickets and HTTP fallback. Only the server confirms damage and results. Its current integration contract is **free online Skirmish**. It does not move WICKB or reuse Classic settlement.

See [TACTICS-EXPANSION.md](TACTICS-EXPANSION.md) for the exact capability and endpoint contract the owner can attach to their backend. No backend endpoints were added in this revision.

## Implementation

| File | Responsibility |
| --- | --- |
| `public/game/play-ui.js` | Pure lobby, launch options, Classic battle shell and quick guide |
| `public/game/client.js` | Shared navigation, existing Classic flows and Skirmish launch orchestration |
| `public/game/tactics/client.js` | Captain/squad editor, Skirmish practice and online HUD |
| `public/game/tactics/loadout.js` | Validated device-local squad/captain/specialization preferences |
| `public/game/tactics/online.js` | Explicit capability check, snapshot validation and frontend transport |
| `public/game/art-direction.js`, `app/palette.css` | Canonical UI/arena colors and generated CSS variables |
| `app/arena-ui.css` | Shared theme and Classic/lobby responsive styling |
| `public/game/three/environment.js`, `renderer.js` | Arena materials, light-blue background, fog and daylight colors |
| `app/tactics.css` | Skirmish setup and battle layouts |
| `app/skirmish/page.tsx` | Direct Skirmish lobby route; `/tactics` remains compatible |

## Verification

On 2026-10-19 the current console-color revision passed the full JavaScript suite: **166 tests, zero failures**, using `node --test --test-concurrency=1 --test-reporter=tap tests/*.test.mjs`. New checks cover the two-version/two-opponent lobby, wallet-free practice, entry/loss disclosures, retained Classic control hooks, loadout recovery, protocol gating, strict snapshots, authenticated command envelopes, stale/wrong-side rejection and pending-command cleanup on disconnect. Existing engine, market, wallet, contract, geometry and realtime regressions remain included.

TypeScript passed and the production build completed, including `/`, `/skirmish` and `/tactics`. Browser/GPU and physical-device visual playtesting are unavailable in this managed authoring environment; automated checks do not certify visual appearance, frame rate or production multiplayer capacity.

## Current console-color revision

The latest revision replaces the detailed painted portraits with cleaner 3D-style roster images and changes the entire frontend to an ivory/cobalt palette. Yellow costs and rewards, coral opponent accents, green positive information and per-fighter card tints add color with specific roles. The shared arena palette now has a light sky, blue river and ivory towers. Skirmish cards inherit their own fighter color, just as Classic cards do. Its editor, hand, captain controls and dialogs use the same theme.

See [2D-ART.md](2D-ART.md) for the active masters, optimized sizes, alpha-edge checks, specified text contrast and export instructions. [The prompt guide](ILLUSTRATED-ART-PROMPTS.md) links the exact selected prompts and identifies built-in generation mode. The new sheets are direct asset reviews rather than browser screenshots.

The existing 3D fighter rigs, animation, combat, backend and contracts are unchanged from `e6d0532`. Browser/GPU and physical-device visual playtesting remain unavailable. The current automated checks are recorded in the verification section above.
