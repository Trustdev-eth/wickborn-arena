# Wickborn Arena — Stock Creature Battles

Wickborn Arena ($WICKB) is a 3D creature/tower battle game with a stock-token-inspired frontend roster. Choose Classic, the original 150-second tower battle, or Skirmish, a four-minute captain-led battle. Build an eight-fighter squad, destroy side towers to gain deployment territory, and defeat the central tower.

The Play screen explains the goal immediately and offers two versions, each with Practice and Online Battle. Both practice versions start without a wallet. Classic retains the existing WICKB online flow. Skirmish online is explicitly unavailable until the owner adds its separately versioned server protocol. Boss Hunt and Campaign are removed from the product UI.

The latest frontend revision keeps the approved portraits and deep blue world backdrop, with matching slate-blue content panels, subtly tinted fighter cards and a gold/ivory arena crest. The sculpted island, fighter models and thirteen original local sound effects remain unchanged. See [the live 3D/audio guide](docs/LIVE-3D-AND-AUDIO.md) for renders, editable models and verification limits, and [the artwork guide](docs/2D-ART.md) for the unchanged portrait masters and current UI palette.

The latest work changes the frontend only. Your existing backend, contracts, database and gameplay engines are unchanged. See [the UI guide](docs/UI-REDESIGN.md), [Skirmish controls and online integration](docs/TACTICS-EXPANSION.md), and [the stock roster boundary](docs/FRONTEND-STOCKS.md).

## Existing engine and infrastructure

- The frontend presents twelve stock-token fighters with matching new card artwork and articulated 3D rigs: AAPLx bull, TSLAx fox, MSFTx tortoise, GOOGLx penguin, AMZNx courier gliders, NVDAx golem, JNJx frog, METAx dragon, JPMx rhino, NFLXx moth, MCDx slime and HOODx owl. The existing server protocol roster is retained; see the stock-feed integration boundary in `docs/FRONTEND-STOCKS.md`.
- Deep blue world backdrop, slate-blue panels, sky-blue controls and gold play accents across battle/collection/upgrades/ranks/trainer/rewards screens, fixed timer/health/hand layout, orbitable 3D camera, accessible lane controls, reduced motion and 2D compatibility fallback.
- Original locally synthesized combat and result audio, with gesture activation, mute/pause handling, stereo panning, event deduplication and a bounded mix. No external audio-generation service or API key is required.
- Free bot practice, existing 25/50/100 WICKB online entries, friend rooms, verified escrow/payouts, staking upgrades, rankings and result celebrations. The current product does not award a signup grant or expose credit play.
- Wallet Standard Solana sign-in with exact server-generated message, Ed25519 verification, domain/nonce/expiry/replay protections and opaque HttpOnly sessions. Existing Sites identity remains compatible. WalletConnect QR/mobile relay is implemented and awaits a Reown project ID.
- Market prices from free public feeds (CoinGecko for crypto, Yahoo Finance for NVDA) or Pyth Hermes when a key is configured, with a shared cache, match-start price baselines and damage updates every `MARKET_INTERVAL` seconds using `clamp(1 + priceChange × MARKET_SENSITIVITY, .85, 1.15)` (see `public/game/tokens.js`). Missing/stale prices are neutral, never simulated. Creatures show market moods and reactions when their damage rises or falls.
- Rankings reflect WICKB earned from finalized token battles. Legacy credit spins and credit milestone claims are retired in the existing backend.
- Character-specific game-token staking ladders (levels 1–5), wallet transaction review, verified finalized receipts, locked-position checks, refunds, expired-position withdrawal and resumable confirmations. Classic practice and online battles use existing staking levels; Skirmish uses equal combat levels.
- Two-finalized-escrow token matchmaking, server-authoritative results, verified payout allocations and an idempotent settlement outbox. The Solana staking/escrow program and HMAC adapter live in `services/contracts`. Real token mode stays disabled until that program, the mint, the adapter and the settlement key are deployed.
- A separate deployable Cloudflare realtime Worker: one SQLite Durable Object per match, fixed ticks, compact player-specific WebSocket snapshots, command acknowledgements, one-use connection tickets, durable recovery and settlement retry.
- Online client prediction (`public/game/predict.js`): the client runs the same deterministic simulation as practice mode, a little ahead of the server by about one round trip, so your own deploys appear instantly. Each authoritative snapshot rebases the simulation and replays commands the server has not acknowledged yet. The server applies a deploy at the game time it was predicted for (up to 0.5 s ahead), so both sides converge exactly.
- Improved live HTTP fallback: independent command queue, stable IDs, no input dropped by a read request, out-of-order rejection and timestamped interpolation. HTTP fallback is not qualified for 500 concurrent players.

## Current publication boundary

The Sites publication includes the game and D1 backend. It cannot provision the separate Durable Object namespace through the current Sites manifest. Deploy `services/realtime` in your Cloudflare account and configure its URL/shared secret to activate WebSockets. Production 500-player capacity has not been verified. A local 500-connection run with mocked dependencies is documented, including its latency limit.

Robinhood integration is not part of this project. The arena program is included but not deployed from this publication. Live services use the owner’s deployment configuration. Practice works without them; wallet sign-in, staking and Classic online require their corresponding services. No production configuration or contract deployment was performed by this frontend update.

## Code map

- `public/game/engine.js`, `tokens.js`: deterministic combat, deployment areas, token roster, damage and staking policies.
- `public/game/client.js`, `network.js`, `snapshots.js`, `wire.js`, `wallet.js`: UI, ordered transport, rendering buffer, compact protocol and wallet connection.
- `public/game/three/`: shared procedural geometry, articulated motion, effects, environment, health HUD and camera/ray picking.
- `lib/backend.js`: API authorization, profiles, credit accounting, queue/rooms and contract-backed token flow.
- `lib/wallet-auth.js`, `market.js`, `contracts.js`, `rewards.js`, `security.js`: isolated backend concerns.
- `services/realtime/worker.js`, `wrangler.jsonc`: independent realtime deployment.
- `services/contracts/`: Solana staking/escrow program, PDA layout and HTTPS contract adapter.
- `db/schema.ts`, `drizzle/`: D1 schema, indexes and append-only migrations.
- `docs/BACKEND-DESIGN.md`: research and architecture written before implementation.
- `docs/INTEGRATION.md`: exact owner configuration and contract-adapter protocol.
- `docs/VALIDATION.md`: checks performed, measured local load and remaining qualification.
- `docs/TOKEN-ART-PROMPT.md`, `ART.md`: art provenance/design map.

## Checks

```sh
node --test tests/*.test.mjs
cargo test --manifest-path services/contracts/Cargo.toml
npm --prefix services/contracts/adapter test
node node_modules/typescript/bin/tsc --noEmit --incremental false
node scripts/load-realtime.mjs --players 500 --seconds 10
npm run build
```

To run the realtime server locally, start `pnpm realtime:dev` (port 8787) next to `pnpm dev`. The site reads `REALTIME_URL=http://127.0.0.1:8787`, `REALTIME_SHARED_SECRET` and `SITE_ORIGIN=http://127.0.0.1:5173` from the git-ignored `.env.local`; the worker reads the same secret and origin from `services/realtime/.dev.vars`. Without the realtime server, online matches fall back to HTTP.

To run the staking adapter locally, start `pnpm adapter:dev` (port 8788) next to `pnpm dev`. Put the same `CONTRACT_ADAPTER_KEY`, `GAME_TOKEN_MINT` and `GAME_PROGRAM_ID` in `.env.local` and in `services/contracts/adapter/.env` (RPC and settlement keypair stay on the adapter). `CONTRACT_ADAPTER_URL=http://127.0.0.1:8788` is enough for staking review; token battles also need the owner’s existing `LIVE_TOKEN_ENABLED`, oracle and realtime requirements satisfied. This UI update does not change those requirements.

Requires Node 22.13+ and the lockfile's package-manager dependencies. Hosted D1 migrations apply during Sites publication. Preserve the Sites build integration and `DB` binding. Never edit already-applied migration history.

Browser/GPU/physical-device visual playtesting was unavailable in the authoring environment. Geometry/framing, actual local D1 transactions, wallet cryptography and actual local workerd WebSockets are covered separately; automated checks do not certify mobile frame rate or production capacity.


## Frontend game versions

| Version | Practice | Online |
| --- | --- | --- |
| Classic | Original automatic-combat tower game, 2:30 | Existing wallet and WICKB match flow |
| Skirmish | Direct captain movement, aimed skills, ultimate and relay, 4:00 | Frontend ready; requires the owner’s Skirmish backend integration |

Open `/` for the default Classic lobby or `/skirmish` for Skirmish selected. `/tactics` remains a compatible alias. The navigation is Play, Fighters, Upgrades and Rankings; wallet and trainer controls remain in the header. Customize Skirmish from its squad preview.

The shared console-game palette covers the lobby, collection, upgrades, rankings, wallet, dialogs, results and 3D arena environment. During a battle the navigation is replaced by a focused arena, visible timer and combat controls. On mobile, play choices appear before the decorative arena illustration.
