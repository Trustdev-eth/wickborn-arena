# Wickborn Skirmish

Skirmish is the captain-led version of Wickborn Arena. Select it from Play, open `/skirmish`, or use the compatible `/tactics` route. Classic remains the original 150-second game. The current UI exposes only these two versions; Boss Hunt and Campaign have been removed from navigation and launch flows.

## Practice and controls

Practice is a free, four-minute duel against captain AI. It never spends or awards WICKB. Choose eight fighters and one captain from that squad. All twelve stock-inspired fighters can be captains; each has an aimed skill, ultimate, two optional specializations and an explained weakness. All combat levels are one.

| Input | Action |
| --- | --- |
| Tap arena, right-click, WASD or arrows | Move captain |
| M | Return to move targeting |
| Q, then tap target | Aim and cast skill |
| R, then tap target | Aim ultimate when resolve reaches 100 |
| 1–4, then tap blue territory | Deploy squad fighter |
| Space | Hold position and cancel movement/charging |
| E | Spend a relay barrier charge |
| P or Escape | Open practice pause / online live menu |

Captains attack nearby enemies while holding position. Movement can interrupt charging or healing. Death imposes a 14-second recovery. The river relay opens at 35 seconds; five uncontested seconds award one team barrier charge. Destroying a side tower expands deployment territory in that lane. Destroy the central tower to win; at timeout, destroyed towers decide the winner, then remaining tower health.

The result screen can replay or download a local practice recording, including recorded AI commands and market pulses. Export is supported; importing arbitrary replay files is not exposed. Online replay export is not offered because viewer snapshots intentionally hide the opponent’s deck and orders. Device-local practice records are not a global ranking.

## Stock quotes

Skirmish snapshots valid matching stock quotes at match start and refreshes damage every 20 seconds:

```text
damageMultiplier = clamp(1 + ((currentPrice - startPrice) / startPrice) * 6, 0.85, 1.15)
```

Missing start prices stay neutral for the whole match. Stale, future, rolled-back or changed-feed quotes cannot move the multiplier. Baselines do not reset. The frontend reads the owner’s existing `/api/market`; crypto quotes are never relabeled as stocks. The unchanged Classic rules and stock mapping boundary are documented in [FRONTEND-STOCKS.md](FRONTEND-STOCKS.md).

## Frontend online contract

**Current status:** the existing backend serves Classic and does not expose Skirmish endpoints or its runtime capability. Skirmish online therefore displays **Online coming soon**. Practice works immediately. This revision changes frontend code only.

To activate the implemented free Skirmish online UI, the owner’s backend must authenticate players, host authoritative duels and extend `/api/runtime` with:

```json
{
  "skirmish": {
    "enabled": true,
    "protocol": "wickborn-tactics/1",
    "entry": "free",
    "path": "skirmish"
  }
}
```

`path` is relative to `/api/` and defaults to `skirmish`. Disabled, missing, incompatible or paid capabilities are not entered by this frontend. The existing token arena is not a Skirmish fallback.

| Endpoint | Frontend request / expected response |
| --- | --- |
| `POST /api/skirmish/battle` | `{protocol, actionId, mode: "ranked" or "friendly", code?, deck, captain, specs}`; returns `{protocol, id or matchId, code?, status}` or a full snapshot |
| `GET /api/skirmish/match/:id` | Waiting/cancelled envelope, or full viewer snapshot |
| `POST /api/skirmish/match/:id/cancel` | `{protocol}`; cancelled envelope or full snapshot if the match already started |
| `POST /api/skirmish/match/:id/ticket` | `{protocol}`; `{url}` for an authenticated, short-lived WebSocket ticket |
| `POST /api/skirmish/match/:id/command` | Versioned command envelope; `{protocol, actionId, ok, error?, ...snapshot}` |

The client sends same-origin JSON through the existing authenticated `call()` wrapper. Match IDs must contain 1–100 word/hyphen characters. Queue responses carry the exact protocol. Full snapshots have `{protocol, side: 0 or 1, sequence, state, connection?: {url}}`; state is a detached viewer snapshot of a `mode: "duel"`, `ruleset: "wickborn-tactics"` game. Sequence is a monotonically increasing nonnegative integer.

With a socket ticket, full JSON frames use the same protocol. Command messages contain only `protocol`, unique `actionId`, `type`, and the applicable `slot`, `x`, `y`. Acknowledgements echo `actionId`, `ok` and optional `error`, and may carry a snapshot. Snapshots can also arrive independently. Ping `{protocol, type: "ping", at}` expects `{protocol, type: "pong", at}`. All packets must carry the negotiated protocol; the old compact Classic wire serializer is not used.

Without a socket URL the frontend polls at 120 ms after each completed request and sends commands independently. This fallback is functional integration behavior, not a production capacity claim. WebSockets are recommended for live play. Failed or disconnected commands are not silently treated as accepted or automatically duplicated. Stale snapshots and wrong-side packets are ignored. Snapshot interpolation smooths positions without inventing damage or results. For side 1, pointer and keyboard Y are mirrored before commands are sent.

### Existing authority adapter

`public/game/tactics/protocol.js` already exports the pure `TacticsAuthority` adapter. It was not changed or connected to the backend in this revision. The owner can host one instance per authenticated match, validate both loadouts, advance fixed 20 Hz ticks, ingest trusted stock quotes and send `snapshot(authenticatedPlayer)` envelopes. It maps identities to sides, limits/idempotently records commands, and hides the opponent’s hand, deck, queue and movement orders. Browser-supplied state, price, levels and side are not authority.

A production host still needs durable checkpoints and receipts, restart/disconnect recovery, bounded payloads and load qualification. The current UI integration is free Skirmish only. Paid Skirmish would require an explicit backend/contract integration and separate frontend transaction review. Do not wire an authority-adapter result directly to token payouts. Classic settlement remains the owner’s existing verified flow.

## Validation

Run `node --test tests/*.test.mjs`, `node node_modules/typescript/bin/tsc --noEmit --incremental false`, and `npm run build`. The full suite passed **166 tests, zero failures** on 2026-10-19, including existing tactical engine/replay, authority/privacy, market, Classic, wallet, contract and geometry checks. New frontend tests cover protocol gating, snapshots, authoritative command acknowledgements, stale/wrong-side rejection and disconnection cleanup.

Browser/GPU and physical-device playtesting were unavailable in this environment. No live human Skirmish match, token deployment or 500-player production capacity has been verified.
