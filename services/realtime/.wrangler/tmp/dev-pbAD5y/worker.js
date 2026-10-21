var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../../public/game/wire.js
var kinds = ["spawn", "poof", "heal", "bolt", "hit"];
var types = ["Fire", "Electric", "Nature", "Ice", "Shadow", "Earth", "Water", "Metal", "Light"];
var states = ["live", "no-baseline", "stale"];
var actions = ["idle", "move", "attack"];
var n = /* @__PURE__ */ __name((x) => Number.isFinite(x) ? Math.round(x * 100) / 100 : 0, "n");
var v = /* @__PURE__ */ __name((x) => Number.isFinite(x) ? x : 0, "v");
function packPacket(packet) {
  if (!packet.state) return packet;
  const { state: g, ...rest } = packet;
  return { ...rest, wire: 1, frame: {
    t: g.time,
    s: g.status,
    w: g.winner,
    n: g.names,
    e: g.elixir,
    l: g.levels,
    h: g.hand,
    q: g.queue,
    d: g.decks,
    c: g.score,
    i: g.nextId,
    x: g.fxSeq || 0,
    u: g.units.map((u) => [u.id, u.card, u.p, v(u.x), v(u.y), v(u.hp), u.maxHp, actions.indexOf(u.action), u.baby ? 1 : 0, v(u.slow), v(u.stun), v(u.facingX), v(u.facingY), v(u.cd), v(u.healCd), v(u.age), u.charged ? 1 : 0]),
    v: g.towers.map((t) => [t.id, t.p, t.x, t.y, v(t.hp), t.maxHp, t.king ? 1 : 0, v(t.cd), t.range]),
    f: g.effects.map((e) => [e.id, kinds.indexOf(e.kind), n(e.x), n(e.y), e.tx == null ? null : n(e.tx), e.ty == null ? null : n(e.ty), e.attacker ?? null, e.victim ?? null, e.card ?? null, e.p ?? null, e.power == null ? null : n(e.power), e.splash || 0, e.attackerAir ? 1 : 0, e.targetAir ? 1 : 0, e.color, n(e.ttl), types.indexOf(e.type)]),
    m: g.market ? [g.market.multipliers, g.market.status.map((s) => states.indexOf(s)), g.market.nextUpdate, g.market.startedAt, g.market.sequence || 0, g.market.source || null] : null
  } };
}
__name(packPacket, "packPacket");

// ../../lib/security.js
var encoder = new TextEncoder();
var b64 = /* @__PURE__ */ __name((bytes) => btoa(String.fromCharCode(...bytes)), "b64");
var unb64 = /* @__PURE__ */ __name((s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)), "unb64");
var base64url = /* @__PURE__ */ __name((b) => b64(b).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""), "base64url");
var fromBase64url = /* @__PURE__ */ __name((s) => unb64(s.replace(/-/g, "+").replace(/_/g, "/")), "fromBase64url");
async function sha256(s) {
  return base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(s))));
}
__name(sha256, "sha256");
async function key(secret) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
__name(key, "key");
async function signToken(payload, secret) {
  const data = base64url(encoder.encode(JSON.stringify(payload))), sig = await crypto.subtle.sign("HMAC", await key(secret), encoder.encode(data));
  return data + "." + base64url(new Uint8Array(sig));
}
__name(signToken, "signToken");
async function verifyToken(token, secret, { aud, now = Date.now() } = {}) {
  try {
    if (typeof token !== "string" || token.length > 4096 || !secret) return null;
    const [data, sig, ...extra] = token.split(".");
    if (extra.length || !await crypto.subtle.verify("HMAC", await key(secret), fromBase64url(sig), encoder.encode(data))) return null;
    const p = JSON.parse(new TextDecoder().decode(fromBase64url(data)));
    return Number.isFinite(p.exp) && p.exp >= now && (!aud || p.aud === aud) ? p : null;
  } catch {
    return null;
  }
}
__name(verifyToken, "verifyToken");
async function signedHeaders(body, secret, now = Date.now()) {
  return { "Content-Type": "application/json", "x-arena-auth": await signToken({ aud: "arena-service", exp: now + 3e4, hash: await sha256(body), nonce: crypto.randomUUID() }, secret) };
}
__name(signedHeaders, "signedHeaders");
async function verifyService(request, body, secret, now = Date.now()) {
  const p = await verifyToken(request.headers.get("x-arena-auth"), secret, { aud: "arena-service", now });
  return !!(p && p.hash === await sha256(body));
}
__name(verifyService, "verifyService");
var LOOPBACK = /* @__PURE__ */ new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
function sameSiteOrigin(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || !a || !b) return false;
  if (a === b) return true;
  try {
    const x = new URL(a), y = new URL(b);
    if (x.protocol !== y.protocol || x.port !== y.port) return false;
    if (x.hostname === y.hostname) return true;
    return LOOPBACK.has(x.hostname) && LOOPBACK.has(y.hostname);
  } catch {
    return false;
  }
}
__name(sameSiteOrigin, "sameSiteOrigin");

// ../../public/game/tokens.js
var TOKENS = [
  { symbol: "AAPLx", underlying: "AAPL", name: "Orchardhorn", feed: "Equity.US.AAPL/USD", asset: "equity", color: "#47b847", baseStake: 300, identity: "A green bull with pearl armor, silver horns and a copper leaf shield." },
  { symbol: "TSLAx", underlying: "TSLA", name: "Voltrunner", feed: "Equity.US.TSLA/USD", asset: "equity", color: "#e64639", baseStake: 220, identity: "A charcoal fox with a scarlet lightning tail and silver battery coils." },
  { symbol: "MSFTx", underlying: "MSFT", name: "Cloudback", feed: "Equity.US.MSFT/USD", asset: "equity", color: "#3078d6", baseStake: 320, identity: "An ivory-and-navy tortoise carrying a fortress of pale-blue cloud cubes." },
  { symbol: "GOOGLx", underlying: "GOOGL", name: "Lensfin", feed: "Equity.US.GOOGL/USD", asset: "equity", color: "#2865dd", baseStake: 180, identity: "A blue penguin scout with a brass lens, red scarf and compass crest." },
  { symbol: "AMZNx", underlying: "AMZN", name: "Parcelpack", feed: "Equity.US.AMZN/USD", asset: "equity", color: "#ee9b24", baseStake: 100, identity: "Three orange courier gliders with teal wings and cardboard parcels." },
  { symbol: "NVDAx", underlying: "NVDA", name: "Tensorforge", feed: "Equity.US.NVDA/USD", asset: "equity", color: "#79bd24", baseStake: 500, identity: "An emerald chip golem with luminous circuits. Heavy tower-breaking compute." },
  { symbol: "JNJx", underlying: "JNJ", name: "Vitalbloom", feed: "Equity.US.JNJ/USD", asset: "equity", color: "#e66c78", baseStake: 180, identity: "A mint frog healer in an ivory coat, carrying a coral lily staff." },
  { symbol: "METAx", underlying: "META", name: "Portalwyrm", feed: "Equity.US.META/USD", asset: "equity", color: "#6951ca", baseStake: 420, identity: "An indigo dragon with lilac scales, cyan portal rings and translucent blue wings." },
  { symbol: "JPMx", underlying: "JPM", name: "Vaultguard", feed: "Equity.US.JPM/USD", asset: "equity", color: "#bf9236", baseStake: 280, identity: "A navy rhinoceros in brass vault armor with a single ivory nose horn." },
  { symbol: "NFLXx", underlying: "NFLX", name: "Reelmoth", feed: "Equity.US.NFLX/USD", asset: "equity", color: "#d73849", baseStake: 140, identity: "A charcoal moth with crimson film-ribbon wings and reel-shaped markings." },
  { symbol: "MCDx", underlying: "MCD", name: "Frydrop", feed: "Equity.US.MCD/USD", asset: "equity", color: "#f0bb2f", baseStake: 120, identity: "A golden slime with a red paper wrap and a crown of chunky golden fries." },
  { symbol: "HOODx", underlying: "HOOD", name: "Hoodwing", feed: "Equity.US.HOOD/USD", asset: "equity", color: "#269e69", baseStake: 360, identity: "A jade owl with a cream face, dark-green hood and layered feather wings." }
];
var MARKET_INTERVAL = 5;
var MARKET_SENSITIVITY = 200;
var MIN_DAMAGE_MULT = 0.85;
var MAX_DAMAGE_MULT = 1.15;
var EQUITY_QUOTE_MAX_MS = 3456e5;
var quoteMaxAgeMs = /* @__PURE__ */ __name((source, asset) => asset === "equity" ? EQUITY_QUOTE_MAX_MS : source === "Pyth" ? 45e3 : 18e4, "quoteMaxAgeMs");
var quoteHasPrice = /* @__PURE__ */ __name((p) => !!p && Number.isFinite(p.price) && p.price > 0 && Number.isFinite(p.publishTime), "quoteHasPrice");
var quoteConnected = /* @__PURE__ */ __name((p) => quoteHasPrice(p) && (p.status === "live" || p.status === "closed-or-stale"), "quoteConnected");
function damageMultiplier(start, current) {
  if (!Number.isFinite(start) || start <= 0 || !Number.isFinite(current) || current <= 0) return 1;
  return Math.max(MIN_DAMAGE_MULT, Math.min(MAX_DAMAGE_MULT, 1 + (current - start) / start * MARKET_SENSITIVITY));
}
__name(damageMultiplier, "damageMultiplier");
function updateMarket(g, frame, at = g.time) {
  if (!g.market) return false;
  const m = g.market;
  if (at + 1e-6 < m.nextUpdate) return false;
  const boundary = m.nextUpdate, wall = m.startedAt + boundary * 1e3;
  m.multipliers = TOKENS.map((_, i) => {
    const p = frame?.prices?.[i], base = m.baseline[i], previous = m.current?.[i];
    if (!base) {
      m.status[i] = "no-baseline";
      return 1;
    }
    if (!quoteConnected(p) || p.publishTime * 1e3 > wall + 5e3 || wall - p.publishTime * 1e3 > quoteMaxAgeMs(m.source, TOKENS[i].asset) || p.publishTime < (previous?.publishTime || base.publishTime)) {
      m.status[i] = "stale";
      return 1;
    }
    m.status[i] = "live";
    return damageMultiplier(base.price, p.price);
  });
  m.current = TOKENS.map((_, i) => m.status[i] === "live" ? frame.prices[i] : m.current?.[i] || null);
  m.sequence++;
  m.history.push({ at: boundary, multipliers: [...m.multipliers], status: [...m.status], prices: m.current.map((p) => p ? { price: p.price, publishTime: p.publishTime, feedId: p.feedId } : null) });
  m.history = m.history.slice(-8);
  m.nextUpdate += MARKET_INTERVAL;
  return true;
}
__name(updateMarket, "updateMarket");

// ../../public/game/engine.js
var STEP = 0.1;
var ROUND = 150;
var BASE_CARDS = [
  { id: 0, name: "Emberfox", type: "Fire", role: "Splash fighter", cost: 3, hp: 540, dmg: 86, speed: 65, range: 46, rate: 0.85, splash: 48, color: "#ff985f", desc: "A quick flame-tailed fighter. Scorches nearby enemies with every attack." },
  { id: 1, name: "Voltkit", type: "Electric", role: "Ranged stunner", cost: 3, hp: 360, dmg: 72, speed: 57, range: 135, rate: 0.9, airHit: true, stun: 0.25, color: "#f9cf42", desc: "Lightning bolts briefly stun their target. Can attack flying creatures." },
  { id: 2, name: "Mossback", type: "Nature", role: "Armored tank", cost: 4, hp: 1450, dmg: 95, speed: 32, range: 45, rate: 1.25, color: "#9fce78", desc: "A sturdy garden guardian. Soaks up damage while your ranged creatures fire." },
  { id: 3, name: "Frostfin", type: "Ice", role: "Slow specialist", cost: 3, hp: 510, dmg: 60, speed: 45, range: 120, rate: 1, slow: 1.8, airHit: true, color: "#8fd3ef", desc: "Frost projectiles slow targets for 1.8 seconds. Excellent on defense." },
  { id: 4, name: "Nightwing", type: "Shadow", role: "Flying swarm", cost: 2, hp: 140, dmg: 31, speed: 86, range: 40, rate: 0.6, air: true, count: 3, airHit: true, color: "#b09de6", desc: "Deploys three quick bats. They fly over the river and overwhelm lone targets." },
  { id: 5, name: "Pebblebeast", type: "Earth", role: "Tower breaker", cost: 5, hp: 1900, dmg: 168, speed: 28, range: 45, rate: 1.35, siege: true, color: "#a9b5a7", desc: "A crystal golem that ignores creatures and heads straight for enemy towers." },
  { id: 6, name: "Bloomimp", type: "Nature", role: "Team healer", cost: 3, hp: 410, dmg: 32, speed: 41, range: 110, rate: 1.1, heal: 45, color: "#dfb5c8", desc: "Heals nearby allies while sending sprout bolts at enemies." },
  { id: 7, name: "Wavewyrm", type: "Water", role: "Flying artillery", cost: 5, hp: 890, dmg: 104, speed: 42, range: 136, rate: 1.25, splash: 56, air: true, airHit: true, color: "#83d5cc", desc: "A flying water dragon. Splash attacks punish tightly packed defenders." },
  { id: 8, name: "Ironhorn", type: "Metal", role: "Charging bruiser", cost: 4, hp: 1060, dmg: 116, speed: 55, range: 44, rate: 1.05, charge: true, color: "#bdc6d8", desc: "An armored rhinoceros. Its first attack deals double damage." },
  { id: 9, name: "Glimmer", type: "Light", role: "Flying support", cost: 2, hp: 230, dmg: 38, speed: 61, range: 118, rate: 0.75, air: true, airHit: true, heal: 18, color: "#f5e6ae", desc: "A luminous moth. Flies above the field, healing allies and firing light." },
  { id: 10, name: "Fizzblob", type: "Water", role: "Splitting slime", cost: 2, hp: 520, dmg: 49, speed: 46, range: 44, rate: 0.85, split: true, color: "#94dbcd", desc: "A bouncy slime that splits into two smaller slimes when defeated." },
  { id: 11, name: "Stormtalon", type: "Electric", role: "Aerial hunter", cost: 4, hp: 640, dmg: 90, speed: 78, range: 122, rate: 0.8, air: true, airHit: true, color: "#a3bee3", desc: "A lightning hawk with fast ranged attacks. Hunts ground and air targets." }
];
var CARDS = BASE_CARDS.map((c, i) => ({ ...c, name: TOKENS[i].name, symbol: TOKENS[i].symbol, color: TOKENS[i].color, desc: TOKENS[i].identity + " " + c.desc, type: i === 0 ? "Metal" : c.type }));
var DEFAULT_DECK = [0, 1, 2, 3, 4, 5, 7, 10];
var BOT_DECK = [0, 1, 2, 4, 6, 7, 8, 11];
var validDeck = /* @__PURE__ */ __name((d) => Array.isArray(d) && d.length === 8 && new Set(d).size === 8 && d.every((i) => Number.isInteger(i) && CARDS[i]), "validDeck");
var stats = /* @__PURE__ */ __name((id, level = 1) => {
  const c = CARDS[id], m = 1 + (Math.max(1, Math.min(5, level)) - 1) * 0.1;
  return { ...c, hp: Math.round(c.hp * m), dmg: Math.round(c.dmg * m), heal: c.heal ? Math.round(c.heal * m) : 0 };
}, "stats");
function newGame({ names = ["Trainer", "Sage Bot"], decks = [DEFAULT_DECK, BOT_DECK], levels = [Array(12).fill(1), Array(12).fill(1)], seed = 91241 } = {}) {
  if (!decks.every(validDeck)) throw new Error("Choose eight different creatures.");
  const towers = [];
  for (let p = 0; p < 2; p++) for (let k = 0; k < 3; k++) towers.push({ id: `t${p}${k}`, p, x: k === 2 ? 300 : k === 0 ? 135 : 465, y: p === 0 ? k === 2 ? 686 : 589 : k === 2 ? 74 : 171, hp: k === 2 ? 3e3 : 2e3, maxHp: k === 2 ? 3e3 : 2e3, king: k === 2, cd: 0, range: k === 2 ? 152 : 166 });
  return { seed: seed || 1, names, levels, time: 0, status: "playing", winner: null, elixir: [5, 5], decks, hand: decks.map((d) => d.slice(0, 4)), queue: decks.map((d) => d.slice(4)), towers, units: [], effects: [], score: [0, 0], nextId: 1, botClock: 2, fxSeq: 0 };
}
__name(newGame, "newGame");
function deploymentZones(g, p) {
  const own = p === 0 ? { x: 38, y: 412, w: 524, h: 222 } : { x: 38, y: 126, w: 524, h: 222 };
  const zones = [own];
  for (const tower of g.towers || []) {
    if (tower.p === p || tower.king || tower.hp > 0) continue;
    const left = tower.x < 300;
    zones.push({ x: left ? 38 : 306, y: p === 0 ? 210 : 412, w: 256, h: 138, lane: left ? "left" : "right" });
  }
  return zones;
}
__name(deploymentZones, "deploymentZones");
function canDeployAt(g, p, x, y) {
  return Number.isFinite(x) && Number.isFinite(y) && deploymentZones(g, p).some((z) => x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h);
}
__name(canDeployAt, "canDeployAt");
function deploy(g, p, slot, x, y) {
  if (g.status !== "playing") return { ok: false, error: "The battle has ended." };
  if (p !== 0 && p !== 1 || !Number.isInteger(slot) || slot < 0 || slot > 3 || !Number.isFinite(x) || !Number.isFinite(y)) return { ok: false, error: "Invalid deployment." };
  if (!canDeployAt(g, p, x, y)) return { ok: false, error: "Deploy in your blue area. Destroy a rival side tower to unlock that lane." };
  const c = stats(g.hand[p][slot], g.levels[p][g.hand[p][slot]]);
  if (g.elixir[p] + 1e-7 < c.cost) return { ok: false, error: "Need more elixir." };
  if (g.units.length > 110) return { ok: false, error: "Arena is full." };
  g.elixir[p] -= c.cost;
  for (let k = 0; k < (c.count || 1); k++) spawn(g, c, p, x + (k - ((c.count || 1) - 1) / 2) * 18, y + k * 5);
  const old = g.hand[p][slot];
  g.hand[p][slot] = g.queue[p].shift();
  g.queue[p].push(old);
  effect(g, { kind: "spawn", x, y, p, ttl: 0.65, color: c.color });
  return { ok: true };
}
__name(deploy, "deploy");
function effect(g, data) {
  g.fxSeq = (g.fxSeq || 0) + 1;
  g.effects.push({ ...data, id: g.fxSeq });
}
__name(effect, "effect");
function spawn(g, c, p, x, y, baby = false) {
  const hp = baby ? Math.round(c.hp * 0.35) : c.hp;
  g.units.push({ id: g.nextId++, card: c.id, p, x, y, hp, maxHp: hp, cd: 0.3, slow: 0, stun: 0, charged: !!c.charge, baby, healCd: 0.5, age: 0 });
}
__name(spawn, "spawn");
var dist = /* @__PURE__ */ __name((a, b) => Math.hypot(a.x - b.x, a.y - b.y), "dist");
function move(u, x, y, s) {
  const d = Math.hypot(x - u.x, y - u.y);
  if (d > 0.01) {
    u.action = "move";
    u.facingX = x - u.x;
    u.facingY = y - u.y;
    u.x += (x - u.x) / d * Math.min(s, d);
    u.y += (y - u.y) / d * Math.min(s, d);
  }
}
__name(move, "move");
function damage(g, u, target, c, mult = 1) {
  const hit2 = /* @__PURE__ */ __name((t) => {
    t.hp -= c.dmg * mult * (g.market?.multipliers?.[u.card] ?? 1) * (u.baby ? 0.48 : 1);
    if ("card" in t) {
      t.slow = Math.max(t.slow, c.slow || 0);
      t.stun = Math.max(t.stun, c.stun || 0);
    }
  }, "hit");
  hit2(target);
  if (c.splash) {
    for (const t of g.units) if (t.p !== u.p && t.id !== target.id && t.hp > 0 && dist(t, target) < c.splash && (c.airHit || !CARDS[t.card].air)) hit2(t);
  }
  effect(g, { kind: c.range > 80 ? "bolt" : "hit", attacker: u.id, victim: target.id, card: u.card, type: c.type, power: c.dmg * mult * (g.market?.multipliers?.[u.card] ?? 1) * (u.baby ? 0.48 : 1), splash: c.splash || 0, attackerAir: !!c.air, targetAir: "card" in target && !!CARDS[target.card].air, x: u.x, y: u.y, tx: target.x, ty: target.y, p: u.p, color: c.color, ttl: 0.65 });
}
__name(damage, "damage");
function step(g, dt = STEP) {
  if (g.status !== "playing") return;
  g.time += dt;
  const rate = g.time >= ROUND - 40 ? 0.85 : 0.43;
  for (let p = 0; p < 2; p++) g.elixir[p] = Math.min(10, g.elixir[p] + dt * rate);
  g.effects = g.effects.filter((e) => (e.ttl -= dt) > 0).slice(-120);
  for (const u of g.units) {
    if (u.hp <= 0) continue;
    const c = stats(u.card, g.levels[u.p][u.card]);
    u.action = "idle";
    u.age += dt;
    u.cd -= dt;
    u.healCd -= dt;
    u.slow = Math.max(0, u.slow - dt);
    u.stun = Math.max(0, u.stun - dt);
    if (c.heal && u.healCd <= 0) {
      for (const a of g.units) if (a.p === u.p && a.hp > 0 && dist(u, a) < 100) {
        const before = a.hp;
        a.hp = Math.min(a.maxHp, a.hp + c.heal);
        if (a.hp > before) effect(g, { kind: "heal", x: a.x, y: a.y, p: u.p, color: "#80ddb3", ttl: 0.6 });
      }
      u.healCd = c.rate;
    }
    if (u.stun > 0) continue;
    let target = null, best = Infinity;
    if (!c.siege) for (const v2 of g.units) {
      if (v2.hp <= 0 || v2.p === u.p || !c.airHit && CARDS[v2.card].air) continue;
      const d = dist(u, v2);
      if (d < best && d < 170) {
        best = d;
        target = v2;
      }
    }
    if (!target) for (const t of g.towers) {
      if (t.p === u.p || t.hp <= 0) continue;
      const d = dist(u, t);
      if (d < best) {
        best = d;
        target = t;
      }
    }
    if (!target) continue;
    if (best <= c.range + ("king" in target ? 26 : 12)) {
      u.action = "attack";
      u.facingX = target.x - u.x;
      u.facingY = target.y - u.y;
      if (u.cd <= 0) {
        damage(g, u, target, c, u.charged ? 2 : 1);
        u.charged = false;
        u.cd = c.rate;
      }
    } else {
      const speed = c.speed * dt * (u.slow > 0 ? 0.55 : 1) * (u.charged ? 1.2 : 1);
      let tx = target.x, ty = target.y;
      if (!c.air && (u.y > 402 && target.y < 358 || u.y < 358 && target.y > 402 || u.y >= 358 && u.y <= 402)) {
        tx = u.x < 300 ? 135 : 465;
        ty = u.p === 0 ? 338 : 422;
      }
      move(u, tx, ty, speed);
    }
  }
  for (const t of g.towers) {
    if (t.hp <= 0) continue;
    t.cd -= dt;
    if (t.cd > 0) continue;
    let target = null, near = t.range;
    for (const u of g.units) {
      if (u.p === t.p || u.hp <= 0) continue;
      const d = dist(t, u);
      if (d < near) {
        near = d;
        target = u;
      }
    }
    if (target) {
      target.hp -= t.king ? 72 : 58;
      t.cd = 0.8;
      effect(g, { kind: "bolt", attacker: t.id, victim: target.id, power: t.king ? 72 : 58, type: "Electric", targetAir: !!CARDS[target.card].air, x: t.x, y: t.y, tx: target.x, ty: target.y, color: t.p === 0 ? "#469eff" : "#f17868", ttl: 0.65 });
    }
  }
  const dead = g.units.filter((u) => u.hp <= 0);
  g.units = g.units.filter((u) => u.hp > 0);
  for (const u of dead) {
    const c = stats(u.card, g.levels[u.p][u.card]);
    effect(g, { kind: "poof", victim: u.id, x: u.x, y: u.y, p: u.p, color: c.color, ttl: 0.6 });
    if (c.split && !u.baby) {
      spawn(g, c, u.p, u.x - 13, u.y, true);
      spawn(g, c, u.p, u.x + 13, u.y, true);
    }
  }
  for (let p = 0; p < 2; p++) g.score[p] = g.towers.filter((t) => t.p !== p && t.hp <= 0).length;
  const kings = g.towers.filter((t) => t.king && t.hp <= 0);
  if (kings.length) {
    g.status = "ended";
    g.winner = kings.length === 2 ? -1 : 1 - kings[0].p;
  }
  if (g.time + 1e-8 >= ROUND && g.status === "playing") {
    g.status = "ended";
    if (g.score[0] !== g.score[1]) g.winner = g.score[0] > g.score[1] ? 0 : 1;
    else {
      const hp = [0, 0];
      for (const t of g.towers) hp[t.p] += Math.max(0, t.hp);
      g.winner = hp[0] === hp[1] ? -1 : hp[0] > hp[1] ? 0 : 1;
    }
  }
}
__name(step, "step");

// ../../public/game/snapshots.js
function playerSnapshot(g, side) {
  const { seed, actionIds, commands: commands2, scheduled, ...safe } = g;
  return { ...safe, decks: g.decks.map((x, p) => p === side ? x : []), hand: g.hand.map((x, p) => p === side ? x : []), queue: g.queue.map((x, p) => p === side ? x : []) };
}
__name(playerSnapshot, "playerSnapshot");

// ../../lib/match-engine.js
var SCHEDULE_WINDOW = 0.5;
function runCommand(g, side, action) {
  if (!action) return { ok: true };
  if (typeof action.actionId !== "string" || !/^[a-zA-Z0-9-]{8,64}$/.test(action.actionId)) return { ok: false, error: "Command ID required." };
  g.commands ??= [];
  const key2 = side + ":" + action.actionId, old = g.commands.find((c) => c.id === key2);
  if (old) return old.result;
  if (g.scheduled?.some((c) => c.id === key2)) return { ok: true, scheduled: true };
  if (action.type === "deploy" && g.status === "playing" && Number.isFinite(action.at) && action.at > g.time + 1e-6 && action.at <= g.time + SCHEDULE_WINDOW) {
    g.scheduled ??= [];
    g.scheduled.push({ id: key2, side, at: action.at, action: { type: action.type, slot: action.slot, card: action.card, x: action.x, y: action.y, actionId: action.actionId } });
    return { ok: true, scheduled: true };
  }
  let result = { ok: true };
  if (g.status !== "playing") result = { ok: false, error: "The battle has ended." };
  else if (action.type === "surrender") {
    g.status = "ended";
    g.winner = 1 - side;
  } else if (action.type === "deploy") result = action.card !== void 0 && action.card !== g.hand[side][action.slot] ? { ok: false, error: "Your hand changed. Choose the card again." } : deploy(g, side, action.slot, action.x, action.y);
  else result = { ok: false, error: "Action not found." };
  g.commands.push({ id: key2, result });
  g.commands = [...g.commands.filter((c) => c.result.ok).slice(-160), ...g.commands.filter((c) => !c.result.ok).slice(-32)];
  return result;
}
__name(runCommand, "runCommand");
function runScheduled(g) {
  if (!g.scheduled?.length) return;
  const due = g.scheduled.filter((c) => c.at <= g.time + 1e-6).sort((a, b) => a.at - b.at);
  if (!due.length) return;
  g.scheduled = g.scheduled.filter((c) => !due.includes(c));
  for (const c of due) {
    const slot = g.hand[c.side].indexOf(c.action.card);
    runCommand(g, c.side, { ...c.action, slot: slot < 0 ? c.action.slot : slot });
  }
}
__name(runScheduled, "runScheduled");
function advanceMatch(g, seconds, frame) {
  if (g.status !== "playing") return 0;
  const steps = Math.max(0, Math.min(1600, Math.floor(Math.min(160, Math.max(0, seconds)) / STEP + 1e-6)));
  let advanced = 0;
  for (let i = 0; i < steps && g.status === "playing"; i++) {
    if (g.market && g.time + 1e-6 >= g.market.nextUpdate) updateMarket(g, frame, g.time);
    runScheduled(g);
    step(g);
    advanced += STEP;
  }
  if (g.status === "playing") {
    if (g.market && g.time + 1e-6 >= g.market.nextUpdate) updateMarket(g, frame, g.time);
    runScheduled(g);
  }
  return advanced;
}
__name(advanceMatch, "advanceMatch");
function processedCommands(g, side) {
  const prefix = side + ":", own = (g.commands || []).filter((c) => c.id.startsWith(prefix));
  return [...own.filter((c) => c.result.ok).slice(-16), ...own.filter((c) => !c.result.ok).slice(-8)].map((c) => c.id.slice(prefix.length));
}
__name(processedCommands, "processedCommands");
function envelope(row, g, side, result = { ok: true }, now = Date.now()) {
  return { id: row.id, side, stake: row.stake, asset: row.asset || "credits", sequence: Math.round((g.time || 0) * 1e3) * 1e3 + (row.version || 0), serverTime: now, transport: row.transport || "http", acks: processedCommands(g, side), state: playerSnapshot(g, side), ...!result.ok ? { error: result.error } : {} };
}
__name(envelope, "envelope");

// ../../public/game/stock-roster.js
var entries = [
  ["AAPLx", "AAPL", "Apple", "Technology", "Orchardhorn", "#47b847", "apple-xstock", "A green bull with pearl armor, silver horns and a copper leaf shield.", "Sweeps nearby enemies with a powerful shoulder strike."],
  ["TSLAx", "TSLA", "Tesla", "Mobility", "Voltrunner", "#e64639", "tesla-xstock", "A charcoal fox with a scarlet lightning tail and silver battery coils.", "Electric bolts briefly stun enemies on the ground or in the air."],
  ["MSFTx", "MSFT", "Microsoft", "Technology", "Cloudback", "#3078d6", "microsoft-xstock", "An ivory-and-navy tortoise carrying a fortress of pale-blue cloud cubes.", "Its cloud armor absorbs damage while the squad advances."],
  ["GOOGLx", "GOOGL", "Alphabet", "Technology", "Lensfin", "#2865dd", "alphabet-xstock", "A blue penguin scout with a brass lens, red scarf and compass crest.", "Lens-guided projectiles slow enemies and defend the lane."],
  ["AMZNx", "AMZN", "Amazon", "Commerce", "Parcelpack", "#ee9b24", "amazon-xstock", "Three orange courier gliders with teal wings and cardboard parcels.", "Three fast airborne couriers overwhelm isolated enemies."],
  ["NVDAx", "NVDA", "NVIDIA", "Technology", "Tensorforge", "#79bd24", "nvidia-xstock", "An emerald chip golem with broad processor shoulders, copper claws and a mint visor.", "Ignores creatures and drives its heavy compute fists into towers."],
  ["JNJx", "JNJ", "Johnson & Johnson", "Healthcare", "Vitalbloom", "#e66c78", "johnson-johnson-xstock", "A mint frog healer in an ivory coat, carrying a coral lily staff.", "Restores nearby allies while firing petal bolts at enemies."],
  ["METAx", "META", "Meta", "Technology", "Portalwyrm", "#6951ca", "meta-xstock", "An indigo dragon with lilac scales, cyan portal rings and translucent blue wings.", "Airborne portal blasts splash across tightly packed defenders."],
  ["JPMx", "JPM", "JPMorgan Chase", "Finance", "Vaultguard", "#bf9236", "jpmorgan-chase-xstock", "A navy rhinoceros in brass vault armor with a single ivory nose horn.", "Charges the front line; its first strike deals double damage."],
  ["NFLXx", "NFLX", "Netflix", "Entertainment", "Reelmoth", "#d73849", "netflix-xstock", "A charcoal moth with crimson film-ribbon wings and reel-shaped markings.", "Supports the squad with healing light and swift ranged attacks."],
  ["MCDx", "MCD", "McDonald's", "Commerce", "Frydrop", "#f0bb2f", "mcdonalds-xstock", "A golden slime with a red paper wrap and a crown of chunky golden fries.", "Splits into two smaller Frydrops when defeated."],
  ["HOODx", "HOOD", "Robinhood", "Finance", "Hoodwing", "#269e69", "robinhood-xstock", "A jade owl with a cream face, dark-green hood and layered feather wings.", "A swift aerial hunter that strikes ground and flying enemies."]
];
var TOKENS2 = entries.map(([symbol, underlying, company, sector, name, color, slug, identity, ability], id) => Object.freeze({ id, symbol, underlying, company, sector, name, color, identity, ability, asset: "stock-token", chain: "solana", issuer: "Backed Assets", productUrl: "https://assets.backed.fi/products/" + slug, baseStake: TOKENS[id].baseStake }));
var CARDS2 = CARDS.map((c, id) => Object.freeze({ ...c, ...TOKENS2[id], desc: TOKENS2[id].identity + " " + TOKENS2[id].ability }));

// ../../public/game/stock-market.js
function matchesStockQuote(quote, token) {
  if (!quote || !token || !Number.isFinite(quote.price) || quote.price <= 0 || !Number.isFinite(quote.publishTime)) return false;
  const symbol = String(quote.symbol || "").toUpperCase(), xstock = token.symbol.toUpperCase(), underlying = token.underlying;
  if (symbol !== xstock && symbol !== underlying) return false;
  const id = String(quote.feedId || "");
  if (id.startsWith("yahoo:")) return symbol === underlying && id === "yahoo:" + underlying;
  if (id.startsWith("coingecko:")) return symbol === xstock && id === "coingecko:" + token.productUrl.split("/").pop();
  if (id.startsWith("Equity.")) return id === "Equity.US." + underlying + "/USD";
  return symbol === xstock && id.length > 0;
}
__name(matchesStockQuote, "matchesStockQuote");

// ../../public/game/tactics/config.js
var TACTICS_VERSION = 1;
var TACTICS_STEP = 0.05;
var TACTICS_ROUND = 240;
var MARKET_PULSE = 20;
var STARTER_SQUAD = [0, 1, 2, 3, 5, 6, 8, 11];
var identities = [
  ["Shoulder sweep", "Crown of thorns", "sweep", 0.35, 9, 135, 105, "Sweep nearby enemies and push them back.", "Briar guard", "Trade 15% attack damage for 20% health.", "Stampede", "Trade 12% health for 15% speed.", "Flank the sweep; punish its recovery."],
  ["Circuit dash", "Thunder circuit", "dash", 0.2, 9, 185, 118, "Dash to your aim point and electrify enemies along the path.", "Disruptor", "Longer stun; 18% less attack damage.", "Predator", "20% more damage to isolated enemies; 12% less health.", "Bait the dash, then attack while it recharges."],
  ["Cloud bulwark", "Citadel protocol", "shield", 0.3, 12, 180, 0, "Face your aim point and shield allies behind your frontal arc.", "Bastion", "Stronger shields; 15% slower movement.", "Vanguard", "20% more speed; a smaller protective arc.", "Move behind the shield or interrupt its channel."],
  ["Prismatic lens", "Whiteout", "frost", 0.45, 10, 220, 100, "Mark a slowing blast at your aim point.", "Surveyor", "Larger slowing field; 15% less damage.", "Sharpshooter", "20% more attack range; 12% less health.", "Leave the marked circle before the lens fires."],
  ["Express flight", "Priority airlift", "decoy", 0.25, 12, 160, 65, "Reposition and release two temporary courier decoys.", "Fleet", "Faster couriers; 15% less health.", "Escort", "20% more health; 12% less attack damage.", "Use area attacks against the decoys."],
  ["Siege beam", "Overclock annihilation", "beam", 1.25, 13, 300, 310, "Charge a narrow beam. Movement or a stun cancels the charge.", "Overclock", "25% more beam damage; a longer charge.", "Bulwark", "20% more health; 15% less beam damage.", "Interrupt the visible charge or step out of the beam."],
  ["Lifeline", "Second spring", "heal", 0.25, 12, 145, 0, "Channel healing links for four seconds. Move or interrupt to break them.", "Restorer", "25% stronger healing; 20% less damage.", "Field medic", "Faster movement; shorter healing reach.", "Separate the healer from allies or interrupt the channel."],
  ["Portal collapse", "Event horizon", "portal", 0.75, 12, 245, 175, "Collapse a marked portal and pull enemies toward its center.", "Singularity", "Wider portal; 18% less attack damage.", "Skyfire", "20% more burst damage; 15% less health.", "Spread out and escape the portal warning."],
  ["Vault charge", "Unbreakable advance", "charge", 0.6, 11, 200, 175, "Rush through a straight line, knocking enemies aside.", "Sentinel", "20% more health; 15% less damage.", "Breacher", "25% stronger charge; 15% less health.", "Sidestep the charge and attack its exposed recovery."],
  ["Ribbon snare", "Final curtain", "snare", 0.55, 11, 210, 90, "Place a ribbon field that slows and damages enemies.", "Director", "Longer snare; 15% less damage.", "Spotlight", "20% stronger attacks; 15% less healing.", "Leave the ribbon field and pressure the fragile caster."],
  ["Golden geyser", "Supersize", "geyser", 0.5, 10, 170, 100, "Erupt beneath enemies and release two short-lived Frydrops.", "Sticky", "Stronger slow; 15% less attack damage.", "Hearty", "25% more health; 15% slower movement.", "Spread out and clear the small Frydrops."],
  ["Feather fan", "Midnight hunt", "fan", 0.35, 9, 230, 125, "Fire a broad feather volley; wounded targets take extra damage.", "Tracker", "Longer range; 12% less damage.", "Executioner", "More damage against wounded enemies; 15% less health.", "Use a healthy front line to protect wounded allies."]
];
var TACTICAL_FIGHTERS = identities.map((r, id) => Object.freeze({ ...CARDS2[id], skill: r[0], ultimate: r[1], kind: r[2], windup: r[3], cooldown: r[4], reach: r[5], power: r[6], skillDescription: r[7], specs: [{ name: r[8], description: r[9] }, { name: r[10], description: r[11] }], counter: r[12] }));
function fighterStats(id, spec = 0, captain = false) {
  const base = TACTICAL_FIGHTERS[id];
  if (!base) throw new Error("Unknown fighter.");
  const c = { ...base, hp: base.hp * (captain ? 1.6 : 1), dmg: base.dmg, speed: base.speed, heal: base.heal || 0 };
  const health = /* @__PURE__ */ __name((n2) => c.hp *= n2, "health"), damage2 = /* @__PURE__ */ __name((n2) => c.dmg *= n2, "damage"), speed = /* @__PURE__ */ __name((n2) => c.speed *= n2, "speed");
  if (id === 0) {
    if (spec === 0) {
      health(1.2);
      damage2(0.85);
    } else {
      health(0.88);
      speed(1.15);
    }
  }
  if (id === 1) {
    if (spec === 0) damage2(0.82);
    else health(0.88);
  }
  if (id === 2) {
    if (spec === 0) speed(0.85);
    else speed(1.2);
  }
  if (id === 3) {
    if (spec === 0) damage2(0.85);
    else {
      c.range *= 1.2;
      health(0.88);
    }
  }
  if (id === 4) {
    if (spec === 0) {
      speed(1.2);
      health(0.85);
    } else {
      health(1.2);
      damage2(0.88);
    }
  }
  if (id === 5 && spec === 1) health(1.2);
  if (id === 6) {
    if (spec === 0) {
      c.heal *= 1.25;
      damage2(0.8);
    } else speed(1.2);
  }
  if (id === 7) {
    if (spec === 0) damage2(0.82);
    else {
      damage2(1.2);
      health(0.85);
    }
  }
  if (id === 8) {
    if (spec === 0) {
      health(1.2);
      damage2(0.85);
    } else health(0.85);
  }
  if (id === 9) {
    if (spec === 0) damage2(0.85);
    else {
      damage2(1.2);
      c.heal *= 0.85;
    }
  }
  if (id === 10) {
    if (spec === 0) damage2(0.85);
    else {
      health(1.25);
      speed(0.85);
    }
  }
  if (id === 11) {
    if (spec === 0) {
      c.range *= 1.2;
      damage2(0.88);
    } else health(0.85);
  }
  return c;
}
__name(fighterStats, "fighterStats");

// ../../public/game/tactics/engine.js
var clamp = /* @__PURE__ */ __name((n2, a, b) => Math.max(a, Math.min(b, n2)), "clamp");
var distance = /* @__PURE__ */ __name((a, b) => Math.hypot(a.x - b.x, a.y - b.y), "distance");
var validPoint = /* @__PURE__ */ __name((c) => Number.isFinite(c.x) && Number.isFinite(c.y) && c.x >= 24 && c.x <= 576 && c.y >= 45 && c.y <= 715, "validPoint");
var fail = /* @__PURE__ */ __name((error) => ({ ok: false, error }), "fail");
function createTactics({ seed = 918273, names = ["Commander", "Sage Captain"], decks = [STARTER_SQUAD, STARTER_SQUAD], captains = [1, 5], specs = [Array(12).fill(0), Array(12).fill(0)], mode = "duel", difficulty = "normal", startedAt = 0, marketFrame = null } = {}) {
  if (!["duel", "hunt"].includes(mode) || !decks.every(validDeck) || captains.length !== 2 || captains.some((id, p) => !decks[p].includes(id))) throw new Error("Choose a valid squad and a captain from that squad.");
  if (specs.length !== 2 || specs.some((s) => !Array.isArray(s) || s.length !== 12 || s.some((v2) => v2 !== 0 && v2 !== 1))) throw new Error("Choose a valid specialization.");
  const g = newGame({ seed, names, decks: decks.map((d) => [...d]), levels: [Array(12).fill(1), Array(12).fill(1)] });
  Object.assign(g, { ruleset: "wickborn-tactics", version: TACTICS_VERSION, simulationStep: TACTICS_STEP, round: TACTICS_ROUND, mode, difficulty, startedAt, specs: specs.map((s) => [...s]), captainCards: [...captains], captains: [null, null], respawn: [0, 0], energy: [25, 25], skillCd: [0, 0], ultCd: [0, 0], barriers: [0, 0], relay: { x: 300, y: 380, radius: 76, active: false, owner: null, progress: [0, 0], nextAt: 35, expiresAt: 0, captures: [0, 0] }, hazards: [], links: [], kills: [0, 0], damage: [0, 0], healing: [0, 0], commands: [], log: [], recentEvents: [], botClocks: [1, 1.6], aiThink: [0.3, 0.6], phase: 1, companionClock: 8, market: { startedAt, baseline: Array(12).fill(null), multipliers: Array(12).fill(1), status: Array(12).fill("no-baseline"), current: Array(12).fill(null), nextUpdate: MARKET_PULSE, sequence: 0 }, boss: null });
  snapshotBaseline(g, marketFrame);
  for (let p = 0; p < 2; p++) spawnCaptain(g, p);
  if (mode === "hunt") {
    g.units = g.units.filter((u) => u.p === 0);
    g.captains[1] = null;
    g.towers = g.towers.filter((t) => t.p === 0);
    g.names[1] = "Citadel Colossus";
    const boss = spawn2(g, 5, 1, 300, 215, { boss: true, hp: 13500 });
    g.boss = { id: boss.id, phase: 1, cd: 5, cast: null, brokenFor: 0 };
  }
  return g;
}
__name(createTactics, "createTactics");
function emit(g, event) {
  g.fxSeq++;
  const e = { id: g.fxSeq, at: g.time, ttl: 0.75, ...event };
  g.effects.push(e);
  g.recentEvents.push(e);
  g.recentEvents = g.recentEvents.slice(-80);
  return e;
}
__name(emit, "emit");
function announce(g, text, p = null) {
  g.log.push({ id: g.fxSeq + 1, at: g.time, text, p });
  g.log = g.log.slice(-10);
}
__name(announce, "announce");
function spawn2(g, card, p, x, y, extra = {}) {
  const c = fighterStats(card, g.specs[p][card], !!extra.captain), hp = extra.hp || c.hp;
  const u = { id: g.nextId++, card, p, x: clamp(x, 24, 576), y: clamp(y, 45, 715), hp, maxHp: hp, cd: 0.4, slow: 0, stun: 0, age: 0, healCd: 1, shield: 0, shieldUntil: 0, guardUntil: 0, action: "idle", facingX: 0, facingY: p === 0 ? -1 : 1, casting: null, recovery: 0, order: null, invulnerable: 0, ...extra };
  g.units.push(u);
  emit(g, { kind: "spawn", x: u.x, y: u.y, p, color: c.color });
  return u;
}
__name(spawn2, "spawn");
function spawnCaptain(g, p) {
  const u = spawn2(g, g.captainCards[p], p, p === 0 ? 255 : 345, p === 0 ? 552 : 208, { captain: true });
  g.captains[p] = u.id;
  g.respawn[p] = 0;
  announce(g, `${p === 0 ? "Your" : "Rival"} captain entered the arena.`, p);
  return u;
}
__name(spawnCaptain, "spawnCaptain");
var captainOf = /* @__PURE__ */ __name((g, p) => g.units.find((u) => u.id === g.captains[p] && u.hp > 0) || null, "captainOf");
var statsOf = /* @__PURE__ */ __name((g, u) => fighterStats(u.card, g.specs[u.p][u.card], !!u.captain), "statsOf");
var opponents = /* @__PURE__ */ __name((g, p) => g.units.filter((u) => u.p !== p && u.hp > 0), "opponents");
function targetAt(g, id) {
  return g.units.find((u) => u.id === id && u.hp > 0) || g.towers.find((t) => t.id === id && t.hp > 0);
}
__name(targetAt, "targetAt");
function aimFrom(u, x, y, reach) {
  const d = Math.hypot(x - u.x, y - u.y), m = d > reach ? reach / d : 1;
  return { x: clamp(u.x + (x - u.x) * m, 24, 576), y: clamp(u.y + (y - u.y) * m, 45, 715) };
}
__name(aimFrom, "aimFrom");
function face(u, target) {
  const dx = target.x - u.x, dy = target.y - u.y, d = Math.hypot(dx, dy) || 1;
  u.facingX = dx / d;
  u.facingY = dy / d;
}
__name(face, "face");
function applyTacticsCommand(g, p, c, { record = true } = {}) {
  if (g.status !== "playing") return fail("The battle has ended.");
  if (p !== 0 && p !== 1) return fail("Invalid side.");
  if (!c || typeof c !== "object") return fail("Invalid command.");
  const u = captainOf(g, p);
  if (c.type === "deploy") {
    if (!Number.isInteger(c.slot) || c.slot < 0 || c.slot > 3 || !validPoint(c)) return fail("Choose a card and a valid deployment point.");
    if (!canDeployAt(g, p, c.x, c.y)) return fail("Deploy inside your blue territory.");
    const id = g.hand[p][c.slot], s = fighterStats(id, g.specs[p][id]);
    if (g.elixir[p] + 1e-8 < s.cost) return fail("More elixir is needed.");
    if (g.units.length + (s.count || 1) > 72) return fail("The arena is full.");
    g.elixir[p] -= s.cost;
    for (let k = 0; k < (s.count || 1); k++) spawn2(g, id, p, c.x + (k - ((s.count || 1) - 1) / 2) * 18, c.y + k * 4);
    g.hand[p][c.slot] = g.queue[p].shift();
    g.queue[p].push(id);
  } else if (c.type === "move") {
    if (!u) return fail("Your captain is recovering.");
    if (!validPoint(c)) return fail("Choose a point inside the arena.");
    if (u.casting) {
      u.casting = null;
      u.recovery = 0.35;
      emit(g, { kind: "interrupt", x: u.x, y: u.y, p, text: "CANCELLED" });
    }
    u.order = { x: c.x, y: c.y };
    u.channel = null;
  } else if (c.type === "hold") {
    if (!u) return fail("Your captain is recovering.");
    u.order = null;
    u.channel = null;
    u.casting = null;
  } else if (c.type === "skill" || c.type === "ultimate") {
    if (!u) return fail("Your captain is recovering.");
    if (!validPoint(c)) return fail("Aim inside the arena.");
    if (u.stun > 0 || u.casting || u.dash || u.recovery > 0) return fail("Wait for your captain to recover.");
    const ultimate = c.type === "ultimate", f = TACTICAL_FIGHTERS[u.card];
    if (ultimate ? g.energy[p] < 100 || g.ultCd[p] > 0 : g.skillCd[p] > 0) return fail(ultimate ? "The ultimate needs 100 resolve." : "Your skill is recharging.");
    const aim = aimFrom(u, c.x, c.y, ultimate ? 330 : f.reach), windup = ultimate ? 0.85 : f.windup * (u.card === 5 && g.specs[p][5] === 0 ? 1.2 : 1);
    if (ultimate) {
      g.energy[p] = 0;
      g.ultCd[p] = 22;
    } else g.skillCd[p] = f.cooldown;
    u.order = null;
    u.channel = null;
    face(u, aim);
    u.casting = { kind: ultimate ? "ultimate" : f.kind, x: aim.x, y: aim.y, left: windup, total: windup, ultimate };
    u.action = "cast";
    emit(g, { kind: "cast", attacker: u.id, card: u.card, p, x: u.x, y: u.y, tx: aim.x, ty: aim.y, castKind: f.kind, ultimate, ttl: windup, color: f.color });
  } else if (c.type === "barrier") {
    if (g.barriers[p] <= 0) return fail("Capture the relay to earn a barrier.");
    g.barriers[p]--;
    for (const a of g.units) if (a.p === p && a.hp > 0) {
      a.shield = Math.min(a.maxHp * 0.6, a.shield + 220);
      a.shieldUntil = g.time + 7;
    }
    emit(g, { kind: "barrier", p, x: 300, y: p === 0 ? 520 : 240, color: "#7acbff" });
    announce(g, "Relay barrier activated.", p);
  } else if (c.type === "surrender") {
    g.status = "ended";
    g.winner = 1 - p;
  } else return fail("Unknown command.");
  if (record) g.commands.push({ tick: Math.round(g.time / TACTICS_STEP), p, ...Object.fromEntries(["type", "slot", "x", "y"].filter((k) => c[k] !== void 0).map((k) => [k, c[k]])) });
  return { ok: true };
}
__name(applyTacticsCommand, "applyTacticsCommand");
function lineDistance(v2, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, t = clamp(((v2.x - a.x) * dx + (v2.y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(v2.x - a.x - dx * t, v2.y - a.y - dy * t);
}
__name(lineDistance, "lineDistance");
function knockback(u, from, amount) {
  const d = distance(u, from) || 1;
  u.x = clamp(u.x + (u.x - from.x) / d * amount, 24, 576);
  u.y = clamp(u.y + (u.y - from.y) / d * amount, 45, 715);
}
__name(knockback, "knockback");
function hit(g, source, target, amount, { stun = 0, slow = 0, knock = 0, skill = false, pierce = false, ability = null } = {}) {
  if (!target || target.hp <= 0 || target.invulnerable > 0) return 0;
  let power = amount * (g.market.multipliers[source.card] || 1);
  if ("card" in target) {
    for (const guard of g.units) {
      if (guard.p !== target.p || guard.hp <= 0 || guard.guardUntil <= g.time || distance(guard, target) > 105) continue;
      const d = distance(guard, source) || 1, dot = ((source.x - guard.x) * guard.facingX + (source.y - guard.y) * guard.facingY) / d;
      if (dot > (g.specs[guard.p][2] === 1 ? 0.35 : 0)) power *= g.specs[guard.p][2] === 0 ? 0.32 : 0.5;
    }
    if (target.boss && g.boss.brokenFor > 0) power *= 1.35;
    if (!pierce && target.shield > 0) {
      const absorbed = Math.min(target.shield, power);
      target.shield -= absorbed;
      power -= absorbed;
    }
    if (stun > 0 && target.casting) {
      target.casting = null;
      target.recovery = 0.7;
      emit(g, { kind: "interrupt", victim: target.id, x: target.x, y: target.y, p: source.p, text: "INTERRUPTED" });
      if (target.boss) {
        g.boss.brokenFor = 3;
        announce(g, "Colossus staggered. Armor exposed!", source.p);
      }
    }
    target.stun = Math.max(target.stun, stun * (target.boss ? 0.45 : 1));
    target.slow = Math.max(target.slow, slow);
    if (knock && !target.boss) knockback(target, source, knock);
  }
  const dealt = Math.min(Math.max(0, target.hp), power);
  target.hp -= power;
  g.damage[source.p] += dealt;
  g.energy[source.p] = Math.min(100, g.energy[source.p] + dealt * 0.012);
  if (skill) emit(g, { kind: "hit", ability, attacker: source.id, victim: target.id, card: source.card, p: source.p, x: source.x, y: source.y, tx: target.x, ty: target.y, power: dealt, color: TACTICAL_FIGHTERS[source.card].color, type: TACTICAL_FIGHTERS[source.card].type, ttl: 0.7 });
  return dealt;
}
__name(hit, "hit");
function heal(g, u, a, amount) {
  const delta = Math.min(amount, a.maxHp - a.hp);
  if (delta <= 0) return;
  a.hp += delta;
  g.healing[u.p] += delta;
  g.energy[u.p] = Math.min(100, g.energy[u.p] + delta * 8e-3);
  emit(g, { kind: "heal", x: a.x, y: a.y, p: u.p, color: "#91f1bf" });
}
__name(heal, "heal");
function radiusHit(g, u, at, radius, power, options = {}) {
  for (const v2 of [...opponents(g, u.p), ...g.towers.filter((t) => t.p !== u.p && t.hp > 0)]) if (distance(v2, at) <= radius) hit(g, u, v2, power, { ...options, skill: true });
}
__name(radiusHit, "radiusHit");
function resolveSkill(g, u, cast) {
  const f = TACTICAL_FIGHTERS[u.card], s = statsOf(g, u), spec = g.specs[u.p][u.card], at = { x: cast.x, y: cast.y };
  u.recovery = cast.ultimate ? 0.6 : 0.35;
  if (cast.ultimate) {
    const allies = g.units.filter((a) => a.p === u.p && a.hp > 0 && distance(a, u) < 250);
    if (u.card === 2) {
      for (const a of allies) {
        a.shield = Math.min(a.maxHp * 0.7, a.shield + 450);
        a.shieldUntil = g.time + 9;
      }
      u.guardUntil = g.time + 8;
    } else if (u.card === 6 || u.card === 9) {
      for (const a of allies) {
        heal(g, u, a, a.maxHp * 0.45);
        a.stun = 0;
        a.slow = 0;
        a.shield = Math.max(a.shield, 100);
        a.shieldUntil = g.time + 5;
      }
    } else if (u.card === 10) {
      heal(g, u, u, u.maxHp * 0.4);
      u.shield = 400;
      u.shieldUntil = g.time + 8;
      radiusHit(g, u, at, 120, 320, { slow: 3 });
    } else {
      radiusHit(g, u, at, u.card === 5 ? 125 : 105, (f.power || 100) * 1.85, { stun: u.card === 1 ? 1.2 : 0.4, slow: 2 });
      if (u.card === 7) g.hazards.push({ p: u.p, card: u.card, source: u.id, ...at, radius: 110, remaining: 4, tick: 0, damage: 35, slow: 1 });
    }
    emit(g, { kind: "ultimate", attacker: u.id, card: u.card, p: u.p, x: at.x, y: at.y, radius: 120, color: f.color, ttl: 1.1 });
    announce(g, f.ultimate + "!", u.p);
    return;
  }
  if (f.kind === "dash" || f.kind === "charge") {
    const from = { x: u.x, y: u.y };
    u.dash = { from, to: at, left: f.kind === "charge" ? 0.35 : 0.25, total: f.kind === "charge" ? 0.35 : 0.25, hitIds: [], power: f.power * (u.card === 8 && spec === 1 ? 1.25 : 1), kind: f.kind };
    if (f.kind === "dash") g.hazards.push({ p: u.p, card: u.card, source: u.id, x: (from.x + at.x) / 2, y: (from.y + at.y) / 2, radius: 42, remaining: 2.5, tick: 0, damage: 22, slow: 0 });
    emit(g, { kind: "dash", attacker: u.id, card: u.card, p: u.p, x: from.x, y: from.y, tx: at.x, ty: at.y, color: f.color, ttl: 0.55 });
    u.recovery = 0;
  } else if (f.kind === "beam") {
    const endpoint = aimFrom(u, at.x, at.y, f.reach), power = f.power * (spec === 0 ? 1.25 : 0.85);
    for (const v2 of [...opponents(g, u.p), ...g.towers.filter((t) => t.p !== u.p && t.hp > 0)]) if (lineDistance(v2, u, endpoint) < 30) hit(g, u, v2, power, { skill: true });
    emit(g, { kind: "beam", attacker: u.id, card: u.card, p: u.p, x: u.x, y: u.y, tx: endpoint.x, ty: endpoint.y, color: f.color, ttl: 0.65 });
    u.recovery = 1;
  } else if (f.kind === "shield") {
    u.guardUntil = g.time + 6;
    u.shield = Math.max(u.shield, s.hp * 0.22);
    u.shieldUntil = g.time + 6;
    emit(g, { kind: "barrier", x: u.x, y: u.y, p: u.p, color: f.color });
  } else if (f.kind === "heal") {
    u.channel = { remaining: 4, tick: 0 };
  } else if (f.kind === "sweep") radiusHit(g, u, u, 95, f.power, { knock: 40, stun: 0.3 });
  else if (f.kind === "frost") {
    radiusHit(g, u, at, spec === 0 ? 85 : 65, f.power, { slow: spec === 0 ? 3.5 : 2.5 });
    g.hazards.push({ p: u.p, card: u.card, source: u.id, ...at, radius: spec === 0 ? 85 : 65, remaining: 3, tick: 0, damage: 8, slow: 1 });
  } else if (f.kind === "portal") {
    for (const v2 of opponents(g, u.p)) if (distance(v2, at) < (spec === 0 ? 105 : 80)) {
      hit(g, u, v2, f.power * (spec === 1 ? 1.2 : 1), { skill: true, slow: 1 });
      if (!v2.boss) {
        v2.x += (at.x - v2.x) * 0.35;
        v2.y += (at.y - v2.y) * 0.35;
      }
    }
  } else if (f.kind === "snare") g.hazards.push({ p: u.p, card: u.card, source: u.id, ...at, radius: 75, remaining: spec === 0 ? 5 : 3.5, tick: 0, damage: 30, slow: 1.3 });
  else if (f.kind === "fan") {
    for (const v2 of opponents(g, u.p)) {
      const d = distance(u, v2), dot = ((v2.x - u.x) * u.facingX + (v2.y - u.y) * u.facingY) / (d || 1);
      if (d < f.reach && dot > 0.65) hit(g, u, v2, f.power * (v2.hp / v2.maxHp < 0.4 ? spec === 1 ? 1.75 : 1.4 : 1), { skill: true });
    }
  } else if (f.kind === "decoy" || f.kind === "geyser") {
    if (f.kind === "decoy") {
      u.x = at.x;
      u.y = at.y;
    } else radiusHit(g, u, at, 75, f.power, { slow: spec === 0 ? 3 : 1.5 });
    for (const dx of [-18, 18]) if (g.units.length < 72) spawn2(g, u.card, u.p, at.x + dx, at.y, { baby: true, hp: s.hp * 0.25, expiresAt: g.time + 9 });
  }
  emit(g, { kind: "skill", attacker: u.id, card: u.card, p: u.p, x: at.x, y: at.y, color: f.color, ttl: 0.6 });
}
__name(resolveSkill, "resolveSkill");
function moveUnit(u, x, y, amount, air = false, dt = TACTICS_STEP) {
  if (!air && (u.y > 403 && y < 358 || u.y < 357 && y > 402 || u.y >= 357 && u.y <= 403)) {
    const bridge = u.x < 300 ? 135 : 465;
    x = bridge;
    y = y < u.y ? 340 : 420;
  }
  const d = Math.hypot(x - u.x, y - u.y);
  if (d < 1) {
    u.vx = 0;
    u.vy = 0;
    return true;
  }
  const acceleration = 1 - Math.exp(-dt * ([2, 5, 8].includes(u.card) ? 6 : 14)), speed = amount / dt;
  u.vx = (u.vx || 0) + ((x - u.x) / d * speed - (u.vx || 0)) * acceleration;
  u.vy = (u.vy || 0) + ((y - u.y) / d * speed - (u.vy || 0)) * acceleration;
  let dx = u.vx * dt, dy = u.vy * dt;
  if (Math.hypot(dx, dy) > d) {
    dx = x - u.x;
    dy = y - u.y;
  }
  face(u, { x, y });
  u.x = clamp(u.x + dx, 24, 576);
  u.y = clamp(u.y + dy, 45, 715);
  u.action = "move";
  return Math.hypot(x - u.x, y - u.y) < 1;
}
__name(moveUnit, "moveUnit");
function chooseTarget(g, u, s) {
  let best = null, range = Infinity;
  if (!s.siege || u.captain || u.boss) for (const v2 of opponents(g, u.p)) {
    if (!s.airHit && TACTICAL_FIGHTERS[v2.card].air) continue;
    const d = distance(u, v2);
    if (d < 190 && d < range) {
      best = v2;
      range = d;
    }
  }
  if (!best) for (const t of g.towers) {
    if (t.p !== u.p && t.hp > 0 && distance(u, t) < range) {
      best = t;
      range = distance(u, t);
    }
  }
  return best;
}
__name(chooseTarget, "chooseTarget");
function updateUnit(g, u, dt) {
  if (u.hp <= 0) return;
  const s = statsOf(g, u);
  u.age += dt;
  u.action = "idle";
  u.cd = Math.max(0, u.cd - dt);
  u.healCd -= dt;
  u.recovery = Math.max(0, u.recovery - dt);
  u.stun = Math.max(0, u.stun - dt);
  u.slow = Math.max(0, u.slow - dt);
  u.invulnerable = Math.max(0, u.invulnerable - dt);
  if (u.shieldUntil < g.time) u.shield = 0;
  if (u.expiresAt && u.expiresAt <= g.time) {
    u.hp = 0;
    return;
  }
  if (u.stun > 0) {
    u.channel = null;
    if (u.dash) {
      u.dash = null;
      u.recovery = 0.7;
      emit(g, { kind: "interrupt", victim: u.id, p: 1 - u.p, x: u.x, y: u.y, text: "INTERRUPTED" });
    }
    return;
  }
  if (u.dash) {
    const dash = u.dash, from = { x: u.x, y: u.y };
    dash.left -= dt;
    const progress = clamp(1 - dash.left / dash.total, 0, 1);
    u.x = dash.from.x + (dash.to.x - dash.from.x) * progress;
    u.y = dash.from.y + (dash.to.y - dash.from.y) * progress;
    face(u, dash.to);
    u.action = "dash";
    for (const v2 of opponents(g, u.p)) if (!dash.hitIds.includes(v2.id) && lineDistance(v2, from, u) < (dash.kind === "charge" ? 42 : 33)) {
      dash.hitIds.push(v2.id);
      hit(g, u, v2, dash.power, { stun: u.card === 1 && g.specs[u.p][1] === 0 ? 1.15 : 0.45, knock: u.card === 8 ? 38 : 0, skill: true, ability: dash.kind });
    }
    if (dash.left <= 0) {
      u.dash = null;
      u.recovery = 0.7;
    }
    return;
  }
  if (u.casting) {
    u.action = "cast";
    u.casting.left -= dt;
    if (u.casting.left <= 0) {
      const cast = u.casting;
      u.casting = null;
      resolveSkill(g, u, cast);
    }
    return;
  }
  if (u.recovery > 0) {
    u.action = "recover";
    return;
  }
  if (u.channel) {
    u.channel.remaining -= dt;
    u.channel.tick -= dt;
    u.action = "channel";
    if (u.channel.tick <= 0) {
      const reach2 = u.card === 6 && g.specs[u.p][6] === 1 ? 105 : 145;
      g.links = g.links.filter((l) => l.from !== u.id);
      for (const a of g.units) if (a.p === u.p && a.hp > 0 && distance(a, u) < reach2) {
        heal(g, u, a, Math.max(25, s.heal) * 1.3);
        if (a !== u) g.links.push({ from: u.id, to: a.id, until: g.time + 0.55 });
      }
      u.channel.tick = 0.5;
    }
    if (u.channel.remaining <= 0) u.channel = null;
    return;
  }
  if (u.order) {
    const intendedTarget = [...opponents(g, u.p), ...g.towers.filter((t) => t.p !== u.p && t.hp > 0)].find((v2) => distance(v2, u.order) < 38 && distance(v2, u) <= s.range + ("king" in v2 ? 26 : 12));
    if (intendedTarget) {
      u.order = null;
      u.vx = 0;
      u.vy = 0;
    } else {
      const done = moveUnit(u, u.order.x, u.order.y, s.speed * 1.45 * dt * (u.slow > 0 ? 0.55 : 1), s.air, dt);
      if (done) u.order = null;
      return;
    }
  }
  if (s.heal && u.healCd <= 0) {
    for (const a of g.units) if (a.p === u.p && a.hp > 0 && distance(a, u) < 100) heal(g, u, a, s.heal);
    u.healCd = 1.4;
  }
  const target = chooseTarget(g, u, s);
  if (!target) return;
  const range = distance(u, target), reach = s.range + ("king" in target ? 25 : 12);
  if (range <= reach) {
    face(u, target);
    u.action = "attack";
    if (u.cd <= 0) {
      if (!u.pending) {
        u.pending = { target: target.id, left: u.card === 5 ? 0.45 : 0.2 };
        emit(g, { kind: "windup", attacker: u.id, card: u.card, x: u.x, y: u.y, tx: target.x, ty: target.y, p: u.p, ttl: u.pending.left, color: s.color });
      }
    }
  } else if (!u.captain) {
    moveUnit(u, target.x, target.y, s.speed * dt * (u.slow > 0 ? 0.55 : 1), s.air, dt);
  } else {
    u.vx = 0;
    u.vy = 0;
  }
}
__name(updateUnit, "updateUnit");
function resolveAttack(g, u, dt) {
  if (!u.pending) return;
  if (u.stun > 0 || u.casting || u.order || u.recovery > 0) {
    u.pending = null;
    return;
  }
  u.pending.left -= dt;
  if (u.pending.left > 0) return;
  const v2 = targetAt(g, u.pending.target), s = statsOf(g, u);
  u.pending = null;
  u.cd = s.rate;
  if (!v2 || distance(u, v2) > s.range + 45) return;
  let power = s.dmg * (u.baby ? 0.5 : 1) * (u.boss ? 1.4 : 1);
  if (u.card === 1 && g.specs[u.p][1] === 1 && !g.units.some((a) => a.p === v2.p && a.id !== v2.id && a.hp > 0 && distance(a, v2) < 80)) power *= 1.2;
  if (u.card === 11 && g.specs[u.p][11] === 1 && v2.hp / v2.maxHp < 0.4) power *= 1.3;
  const dealt = hit(g, u, v2, power, { stun: s.stun || 0, slow: s.slow || 0 });
  if (s.splash) {
    for (const a of opponents(g, u.p)) if (a.id !== v2.id && distance(a, v2) < s.splash) hit(g, u, a, power * 0.7);
  }
  emit(g, { kind: s.range > 80 ? "bolt" : "hit", attacker: u.id, victim: v2.id, card: u.card, p: u.p, power: dealt, x: u.x, y: u.y, tx: v2.x, ty: v2.y, type: s.type, color: s.color, splash: s.splash || 0, attackerAir: !!s.air, targetAir: "card" in v2 && !!TACTICAL_FIGHTERS[v2.card].air });
}
__name(resolveAttack, "resolveAttack");
function updateRelay(g, dt) {
  const r = g.relay;
  if (!r.active && g.time >= r.nextAt) {
    r.active = true;
    r.owner = null;
    r.progress = [0, 0];
    r.expiresAt = g.time + 32;
    announce(g, "The relay is active. Contest the river!");
    emit(g, { kind: "relay", x: r.x, y: r.y, color: "#f1cf7b" });
  }
  if (!r.active) return;
  const presence = [0, 0];
  for (const u of g.units) if (u.hp > 0 && !u.baby && distance(u, r) < r.radius) presence[u.p] += u.captain ? 2 : 1;
  if (presence[0] > 0 && presence[1] === 0) r.progress[0] = Math.min(1, r.progress[0] + dt / 5);
  else if (presence[1] > 0 && presence[0] === 0) r.progress[1] = Math.min(1, r.progress[1] + dt / 5);
  for (let p = 0; p < 2; p++) if (presence[p] === 0) r.progress[p] = Math.max(0, r.progress[p] - dt / 10);
  const owner = r.progress.findIndex((v2) => v2 >= 1);
  if (owner >= 0) {
    r.owner = owner;
    r.captures[owner]++;
    g.barriers[owner] = Math.min(2, g.barriers[owner] + 1);
    r.active = false;
    r.nextAt = g.time + 42;
    announce(g, `${owner === 0 ? "Your squad" : "The rival"} captured a relay barrier.`, owner);
    emit(g, { kind: "capture", p: owner, x: r.x, y: r.y, color: owner === 0 ? "#7acbff" : "#ff737c" });
  } else if (g.time >= r.expiresAt) {
    r.active = false;
    r.nextAt = g.time + 35;
    announce(g, "The contested relay went dormant.");
  }
}
__name(updateRelay, "updateRelay");
function updateBoss(g, dt) {
  const b = g.boss;
  if (!b) return;
  const u = g.units.find((u2) => u2.id === b.id);
  if (!u || u.hp <= 0) return;
  b.brokenFor = Math.max(0, b.brokenFor - dt);
  const phase = u.hp / u.maxHp < 0.33 ? 3 : u.hp / u.maxHp < 0.66 ? 2 : 1;
  if (phase > b.phase) {
    b.phase = phase;
    g.phase = phase;
    announce(g, `Colossus phase ${phase}: ${phase === 2 ? "Armor fracture" : "Last stand"}!`);
    emit(g, { kind: "ultimate", p: 1, x: u.x, y: u.y, radius: 140, color: "#ff7974" });
  }
  b.cd -= dt;
  if (b.cd > 0 || u.casting || u.stun > 0) return;
  const target = opponents(g, 1).sort((a, b2) => Number(!!b2.captain) - Number(!!a.captain) || distance(a, u) - distance(b2, u))[0];
  if (!target) return;
  b.cd = phase === 3 ? 5 : 7;
  u.casting = { kind: "boss", x: target.x, y: target.y, left: 1.6, total: 1.6 };
  emit(g, { kind: "cast", attacker: u.id, card: 5, p: 1, x: u.x, y: u.y, tx: target.x, ty: target.y, castKind: "boss", ttl: 1.6, color: "#ff646d" });
}
__name(updateBoss, "updateBoss");
function updateTowers(g, dt) {
  for (const t of g.towers) {
    if (t.hp <= 0) continue;
    t.cd -= dt;
    if (t.cd > 0) continue;
    const v2 = opponents(g, t.p).filter((u) => distance(t, u) < t.range).sort((a, b) => distance(t, a) - distance(t, b))[0];
    if (!v2) continue;
    const power = t.king ? 65 : 48;
    hit(g, { id: t.id, p: t.p, card: 3, x: t.x, y: t.y }, v2, power);
    t.cd = 0.9;
    emit(g, { kind: "bolt", attacker: t.id, victim: v2.id, power, type: "Electric", x: t.x, y: t.y, tx: v2.x, ty: v2.y, color: t.p === 0 ? "#7acbff" : "#ff737c" });
  }
}
__name(updateTowers, "updateTowers");
function separateUnits(g, dt) {
  const cells = /* @__PURE__ */ new Map(), radius = /* @__PURE__ */ __name((u) => u.boss ? 32 : u.baby ? 9 : u.captain ? 18 : 14, "radius");
  for (const u of g.units) {
    if (u.hp <= 0) continue;
    const key2 = Math.floor(u.x / 64) + "," + Math.floor(u.y / 64);
    if (!cells.has(key2)) cells.set(key2, []);
    cells.get(key2).push(u);
  }
  for (const u of g.units) {
    if (u.hp <= 0) continue;
    const cx = Math.floor(u.x / 64), cy = Math.floor(u.y / 64), air = !!TACTICAL_FIGHTERS[u.card].air;
    for (let x = cx - 1; x <= cx + 1; x++) for (let y = cy - 1; y <= cy + 1; y++) for (const v2 of cells.get(x + "," + y) || []) {
      if (v2.id <= u.id || air !== !!TACTICAL_FIGHTERS[v2.card].air) continue;
      const dx = v2.x - u.x, dy = v2.y - u.y, d = Math.hypot(dx, dy), minimum = radius(u) + radius(v2);
      if (d >= minimum) continue;
      const push = Math.min(2.5, (minimum - d) * dt * 3), nx = d > 1e-3 ? dx / d : u.id % 2 ? 1 : -1, ny = d > 1e-3 ? dy / d : 0, a = !u.casting && !u.channel && !u.boss, b = !v2.casting && !v2.channel && !v2.boss;
      if (a) {
        u.x = clamp(u.x - nx * push, 24, 576);
        u.y = clamp(u.y - ny * push, 45, 715);
      }
      if (b) {
        v2.x = clamp(v2.x + nx * push, 24, 576);
        v2.y = clamp(v2.y + ny * push, 45, 715);
      }
    }
  }
}
__name(separateUnits, "separateUnits");
function cleanup(g) {
  const dead = g.units.filter((u) => u.hp <= 0);
  for (const u of dead) {
    emit(g, { kind: "poof", victim: u.id, x: u.x, y: u.y, p: u.p, color: TACTICAL_FIGHTERS[u.card].color });
    if (u.captain) {
      g.respawn[u.p] = 14;
      g.captains[u.p] = null;
      g.energy[u.p] = Math.max(0, g.energy[u.p] - 15);
      announce(g, `${u.p === 0 ? "Your" : "Rival"} captain is recovering.`, u.p);
    }
    if (!u.expiresAt) g.kills[1 - u.p]++;
    if (u.card === 10 && !u.baby && !u.captain && !u.boss) {
      for (const dx of [-13, 13]) if (g.units.length < 72) spawn2(g, 10, u.p, u.x + dx, u.y, { baby: true, hp: u.maxHp * 0.3 });
    }
  }
  g.units = g.units.filter((u) => u.hp > 0);
  g.links = g.links.filter((l) => l.until > g.time && g.units.some((u) => u.id === l.from) && g.units.some((u) => u.id === l.to));
}
__name(cleanup, "cleanup");
function finishIfNeeded(g) {
  for (let p = 0; p < 2; p++) g.score[p] = g.towers.filter((t) => t.p !== p && t.hp <= 0).length;
  if (g.mode === "hunt") {
    const boss = g.units.find((u) => u.id === g.boss.id);
    if (!boss || boss.hp <= 0) {
      g.status = "ended";
      g.winner = 0;
    } else if (g.towers.some((t) => t.king && t.hp <= 0) || g.time >= g.round) {
      g.status = "ended";
      g.winner = 1;
    }
    return;
  }
  const kings = g.towers.filter((t) => t.king && t.hp <= 0);
  if (kings.length) {
    g.status = "ended";
    g.winner = kings.length === 2 ? -1 : 1 - kings[0].p;
    return;
  }
  if (g.time + 1e-8 >= g.round) {
    const health = [0, 0];
    for (const t of g.towers) health[t.p] += Math.max(0, t.hp);
    g.status = "ended";
    g.winner = g.score[0] !== g.score[1] ? g.score[0] > g.score[1] ? 0 : 1 : Math.abs(health[0] - health[1]) < 1e-3 ? -1 : health[0] > health[1] ? 0 : 1;
  }
}
__name(finishIfNeeded, "finishIfNeeded");
function stepTactics(g, dt = TACTICS_STEP) {
  if (g.status !== "playing") return;
  if (!Number.isFinite(dt) || dt <= 0 || dt > 0.1) throw new Error("Advance with a fixed step of at most 100ms.");
  g.time += dt;
  g.effects = g.effects.filter((e) => (e.ttl -= dt) > 0).slice(-160);
  for (let p = 0; p < 2; p++) {
    g.elixir[p] = Math.min(10, g.elixir[p] + dt * (g.time >= g.round - 60 ? 0.92 : 0.58));
    g.energy[p] = Math.min(100, g.energy[p] + dt * 0.38);
    g.skillCd[p] = Math.max(0, g.skillCd[p] - dt);
    g.ultCd[p] = Math.max(0, g.ultCd[p] - dt);
    if (g.captains[p] === null && !(g.mode === "hunt" && p === 1)) {
      g.respawn[p] -= dt;
      if (g.respawn[p] <= 0) spawnCaptain(g, p);
    }
  }
  for (const u of g.units) {
    if (u.boss && u.casting?.kind === "boss" && u.casting.left <= dt && u.stun <= dt) {
      const at = { x: u.casting.x, y: u.casting.y };
      u.casting = null;
      radiusHit(g, u, at, g.boss.phase === 3 ? 115 : 88, 220 + g.boss.phase * 45, { stun: 0.6 });
      emit(g, { kind: "ultimate", p: 1, x: at.x, y: at.y, radius: 100, color: "#ff646d" });
      u.recovery = 1;
    }
    updateUnit(g, u, dt);
    resolveAttack(g, u, dt);
  }
  for (const h of g.hazards) {
    h.remaining -= dt;
    h.tick -= dt;
    if (h.tick <= 0) {
      const u = g.units.find((u2) => u2.id === h.source);
      if (u) radiusHit(g, u, h, h.radius, h.damage, { slow: h.slow });
      h.tick = 0.5;
    }
  }
  g.hazards = g.hazards.filter((h) => h.remaining > 0).slice(-24);
  separateUnits(g, dt);
  updateTowers(g, dt);
  updateRelay(g, dt);
  updateBoss(g, dt);
  cleanup(g);
  finishIfNeeded(g);
}
__name(stepTactics, "stepTactics");
function quoteFor(frame, id) {
  return frame?.prices?.find((q) => matchesStockQuote(q, TOKENS2[id]) && quoteConnected(q)) || null;
}
__name(quoteFor, "quoteFor");
function snapshotBaseline(g, frame) {
  const maxAge = quoteMaxAgeMs("Public", "equity");
  for (let id = 0; id < 12; id++) {
    const q = quoteFor(frame, id);
    if (q && q.publishTime * 1e3 <= g.startedAt + 5e3 && g.startedAt - q.publishTime * 1e3 <= maxAge) {
      g.market.baseline[id] = { price: q.price, feedId: q.feedId, publishTime: q.publishTime };
      g.market.current[id] = { ...q };
      g.market.status[id] = "live";
    }
  }
}
__name(snapshotBaseline, "snapshotBaseline");
function updateTacticsMarket(g, frame, wallTime = g.startedAt + g.time * 1e3) {
  const m = g.market, maxAge = quoteMaxAgeMs("Public", "equity");
  if (g.time + 1e-8 < m.nextUpdate) return false;
  for (let id = 0; id < 12; id++) {
    const q = quoteFor(frame, id), base = m.baseline[id], prev = m.current[id];
    if (!base) {
      m.status[id] = "no-baseline";
      m.multipliers[id] = 1;
      continue;
    }
    if (!q || q.feedId !== base.feedId || q.publishTime < (prev?.publishTime || base.publishTime) || q.publishTime * 1e3 > wallTime + 5e3 || wallTime - q.publishTime * 1e3 > maxAge) {
      m.status[id] = "stale";
      m.multipliers[id] = 1;
      continue;
    }
    m.current[id] = { ...q };
    m.status[id] = "live";
    m.multipliers[id] = clamp(1 + (q.price - base.price) / base.price * 6, 0.85, 1.15);
  }
  m.sequence++;
  m.nextUpdate = (Math.floor(g.time / MARKET_PULSE) + 1) * MARKET_PULSE;
  return true;
}
__name(updateTacticsMarket, "updateTacticsMarket");

// ../../public/game/tactics/protocol.js
var TACTICS_PROTOCOL = "wickborn-tactics/1";
var commands = /* @__PURE__ */ new Set(["deploy", "move", "hold", "skill", "ultimate", "barrier", "surrender"]);
var TacticsAuthority = class _TacticsAuthority {
  static {
    __name(this, "TacticsAuthority");
  }
  constructor({ players, initial, now = /* @__PURE__ */ __name(() => Date.now(), "now") }) {
    if (!Array.isArray(players) || players.length !== 2 || players.some((p) => typeof p !== "string" || !p) || players[0] === players[1]) throw new Error("Two authenticated player identities are required.");
    if (initial?.mode === "hunt") throw new Error("This adapter supports two-sided tactical duels.");
    this.players = [...players];
    this.game = createTactics({ ...initial, mode: "duel" });
    this.now = now;
    this.sequence = 0;
    this.receipts = [/* @__PURE__ */ new Map(), /* @__PURE__ */ new Map()];
    this.rates = [{ at: now(), count: 0 }, { at: now(), count: 0 }];
    this.accumulator = 0;
    this.frame = initial?.marketFrame || null;
  }
  static restore({ players, game, sequence = 0, accumulator = 0, receipts = [[], []], frame = null }, now = () => Date.now()) {
    if (!Array.isArray(players) || players.length !== 2 || !game) throw new Error("A stored Skirmish authority is required.");
    const host = Object.create(_TacticsAuthority.prototype);
    host.players = [...players];
    host.game = game;
    host.now = now;
    host.sequence = sequence;
    host.accumulator = accumulator;
    host.receipts = [new Map(receipts[0] || []), new Map(receipts[1] || [])];
    host.rates = [{ at: now(), count: 0 }, { at: now(), count: 0 }];
    host.frame = frame || null;
    return host;
  }
  checkpoint() {
    return { players: [...this.players], game: this.game, sequence: this.sequence, accumulator: this.accumulator, receipts: this.receipts.map((m) => [...m.entries()]), frame: this.frame };
  }
  receive(authenticatedPlayer, packet) {
    const side = this.players.indexOf(authenticatedPlayer);
    if (side < 0) return { ok: false, error: "Player is not a participant." };
    if (!packet || typeof packet !== "object" || packet.protocol !== TACTICS_PROTOCOL || !commands.has(packet.type) || typeof packet.actionId !== "string" || !/^[\w-]{8,80}$/.test(packet.actionId)) return { ok: false, error: "Invalid tactical command envelope." };
    const cache = this.receipts[side], saved = cache.get(packet.actionId);
    if (saved) return { ...saved, duplicate: true, sequence: this.sequence };
    if (cache.size >= 4096) return { ok: false, error: "Command allowance exhausted." };
    const rate = this.rates[side], now = this.now();
    if (now - rate.at >= 1e3) {
      rate.at = now;
      rate.count = 0;
    }
    if (rate.count >= 30) return { ok: false, error: "Command rate exceeded." };
    rate.count++;
    const c = Object.fromEntries(["type", "slot", "x", "y"].filter((k) => packet[k] !== void 0).map((k) => [k, packet[k]]));
    const result = { ...applyTacticsCommand(this.game, side, c), actionId: packet.actionId, sequence: ++this.sequence };
    cache.set(packet.actionId, result);
    return result;
  }
  setMarket(frame) {
    this.frame = frame;
  }
  advance(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0 || seconds > 1) throw new Error("Advance at most one second at a time.");
    this.accumulator += seconds;
    let steps = 0;
    while (this.accumulator + 1e-9 >= TACTICS_STEP && this.game.status === "playing") {
      updateTacticsMarket(this.game, this.frame);
      stepTactics(this.game);
      this.accumulator -= TACTICS_STEP;
      this.sequence++;
      steps++;
    }
    return steps;
  }
  snapshot(authenticatedPlayer) {
    const side = this.players.indexOf(authenticatedPlayer);
    if (side < 0) throw new Error("Player is not a participant.");
    const { seed, commands: commands2, decks, hand, queue, market, recentEvents, ...publicState } = this.game;
    const state = { ...structuredClone(publicState), decks: decks.map((d, p) => p === side ? [...d] : []), hand: hand.map((d, p) => p === side ? [...d] : []), queue: queue.map((d, p) => p === side ? [...d] : []), market: structuredClone(market) };
    for (const u of state.units) if (u.p !== side && !u.captain) u.order = null;
    return { protocol: TACTICS_PROTOCOL, version: TACTICS_VERSION, side, sequence: this.sequence, state, acks: [...this.receipts[side].keys()].slice(-32) };
  }
};

// worker.js
var TACTICS_COMMANDS = /* @__PURE__ */ new Set(["move", "hold", "skill", "ultimate", "barrier", "deploy", "surrender"]);
var json = /* @__PURE__ */ __name((data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }), "json");
async function site(env, path, data) {
  const body = JSON.stringify(data), options = { method: "POST", headers: await signedHeaders(body, env.REALTIME_SHARED_SECRET), body, signal: AbortSignal.timeout(7e3) }, response = env.SITES ? await env.SITES.fetch("https://sites.internal/api/internal/" + path, options) : await fetch(new URL("/api/internal/" + path, env.SITE_ORIGIN), options);
  if (!response.ok) throw new Error("Account service unavailable");
  return response.json();
}
__name(site, "site");
var worker_default = {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      if (url.pathname === "/health") return json({ ok: true, protocol: 1 });
      const match = url.pathname.match(/^\/matches\/([a-zA-Z0-9-]{1,64})\/(socket|snapshot|command)$/);
      if (!match) return json({ error: "Not found." }, 404);
      if (!env.REALTIME_SHARED_SECRET || !env.SITE_ORIGIN) return json({ error: "Realtime service is not configured." }, 503);
      if (match[2] === "socket") {
        if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") return json({ error: "WebSocket upgrade required." }, 426);
        const claims = await verifyToken(url.searchParams.get("ticket"), env.REALTIME_SHARED_SECRET, { aud: "arena-room" });
        if (!claims || claims.match !== match[1] || !sameSiteOrigin(claims.origin, env.SITE_ORIGIN) || !sameSiteOrigin(request.headers.get("Origin"), env.SITE_ORIGIN)) return json({ error: "Connection ticket is invalid or expired." }, 403);
      } else {
        if (request.method !== "POST") return json({ error: "POST required." }, 405);
        const raw = await request.clone().text();
        if (raw.length > 4096 || !await verifyService(request, raw, env.REALTIME_SHARED_SECRET)) return json({ error: "Service authentication required." }, 401);
      }
      return env.MATCHES.getByName(match[1]).fetch(request);
    } catch (error) {
      console.warn("Realtime gateway error");
      return json({ error: "Match service is reconnecting." }, 503);
    }
  }
};
var MatchRoom = class {
  static {
    __name(this, "MatchRoom");
  }
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.room = null;
    this.serial = Promise.resolve();
    this.timer = null;
    this.lastSaved = 0;
    this.dirty = false;
    this.persisting = false;
    this.persistTimer = null;
    this.marketPending = null;
    this.marketFrame = null;
    this.ready = ctx.blockConcurrencyWhile(async () => {
      this.room = await ctx.storage.get("room") || null;
      this.hydrate();
      if (this.playing()) this.schedule();
    });
  }
  queue(fn) {
    const next = this.serial.then(fn);
    this.serial = next.catch(() => {
    });
    return next;
  }
  hydrate() {
    if (this.room?.kind === "skirmish" && this.room.checkpoint) this.room.authority = TacticsAuthority.restore(this.room.checkpoint);
  }
  playing() {
    return this.room?.kind === "skirmish" ? this.room.authority?.game?.status === "playing" : this.room?.g?.status === "playing";
  }
  serializable(room = this.room) {
    if (!room) return room;
    if (room.kind === "skirmish") {
      const { authority, ...rest } = room;
      return { ...rest, checkpoint: authority ? authority.checkpoint() : room.checkpoint, sequence: authority?.sequence ?? room.sequence };
    }
    return room;
  }
  hold(promise) {
    if (this.ctx.waitUntil) this.ctx.waitUntil(promise);
    return promise;
  }
  // Live combat stays in memory. SQLite is crash recovery: coalesce writes ~1s after the last mutation.
  persistSoon() {
    this.dirty = true;
    if (this.persisting || this.persistTimer || !this.room) return;
    const wait = Math.max(0, 1e3 - (Date.now() - this.lastSaved));
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      this.flush();
    }, wait);
  }
  flush() {
    if (this.persisting || !this.dirty || !this.room) return;
    this.persisting = true;
    this.hold(this.queue(async () => {
      if (!this.room) {
        this.persisting = false;
        return;
      }
      const stored = this.serializable();
      this.dirty = false;
      const run = this.ctx.storage.put("room", stored).then(async () => {
        this.lastSaved = Date.now();
        const playing = stored?.kind === "skirmish" ? stored.checkpoint?.game?.status === "playing" : stored?.g?.status === "playing";
        await this.ctx.storage.setAlarm(Date.now() + (playing ? 5e3 : 3e4));
      }).catch(() => {
        this.dirty = true;
      }).finally(() => {
        this.persisting = false;
        if (this.dirty) this.persistSoon();
      });
      this.hold(run);
    }));
  }
  pollMarket(g, elapsed = 0) {
    if (!g?.market || g.time + elapsed + 1e-6 < g.market.nextUpdate) return this.marketFrame;
    if (!this.marketPending) {
      const pending = site(this.env, "market", {}).then((frame) => {
        if (frame) this.marketFrame = frame;
      }).catch(() => {
      }).finally(() => {
        this.marketPending = null;
      });
      this.marketPending = pending;
      this.hold(pending);
    }
    return this.marketFrame;
  }
  async finishMatch(state) {
    clearTimeout(this.persistTimer);
    this.persistTimer = null;
    this.dirty = false;
    await this.ctx.storage.put({ room: this.serializable(this.room), outbox: { id: this.room.row.id, state, attempts: 0 } });
    await this.ctx.storage.setAlarm(Date.now() + 1e3);
    clearTimeout(this.timer);
    this.timer = null;
  }
  async bootstrap(id) {
    if (this.room) return;
    const source = await site(this.env, "bootstrap", { id });
    if (source.row.transport !== "realtime" || !source.participants?.[0] || !source.participants?.[1]) throw new Error("Invalid room bootstrap");
    const parsed = typeof source.row.state === "string" ? JSON.parse(source.row.state) : source.row.state;
    const checkpoint = parsed?.checkpoint || null, tactics = source.row.asset === "skirmish" || checkpoint?.game?.ruleset === "wickborn-tactics" || parsed?.ruleset === "wickborn-tactics";
    if (tactics) {
      const stored = checkpoint || { players: source.participants, game: parsed, sequence: source.row.version || 1, accumulator: 0, receipts: [[], []], frame: null };
      if (!stored.game?.towers || stored.game.ruleset !== "wickborn-tactics" || !["playing", "ended"].includes(stored.game.status)) throw new Error("Room is not ready");
      this.room = { kind: "skirmish", row: { id: source.row.id, stake: 0, asset: "skirmish", transport: "realtime" }, participants: source.participants, checkpoint: stored, lastTick: source.row.last_tick, sequence: stored.sequence || source.row.version || 1, createdAt: Date.now(), connections: {} };
      this.hydrate();
      await this.save();
      this.schedule();
      return;
    }
    if (!parsed?.towers || !["playing", "ended"].includes(parsed.status)) throw new Error("Room is not ready");
    this.room = { row: { id: source.row.id, stake: source.row.stake, asset: source.row.asset, transport: "realtime" }, participants: source.participants, g: parsed, lastTick: source.row.last_tick, sequence: source.row.version || 1, createdAt: Date.now() };
    await this.save();
    this.schedule();
  }
  async save(candidate = this.room) {
    const stored = this.serializable(candidate);
    await this.ctx.storage.put("room", stored);
    this.lastSaved = Date.now();
    this.dirty = false;
    const playing = stored?.kind === "skirmish" ? stored.checkpoint?.game?.status === "playing" : stored?.g?.status === "playing";
    await this.ctx.storage.setAlarm(Date.now() + (playing ? 5e3 : 3e4));
  }
  schedule() {
    if (this.timer || !this.playing()) return;
    const interval = this.room?.kind === "skirmish" ? 50 : 100, due = (this.room.lastTick || Date.now()) + interval;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.queue(async () => {
        await this.advance();
        this.broadcast();
      }).catch(() => {
        console.warn("Room tick will recover");
      }).finally(() => this.schedule());
    }, Math.max(0, due - Date.now()));
  }
  async advance() {
    if (!this.playing()) return;
    if (this.room.kind === "skirmish") return this.advanceSkirmish();
    const now = Date.now(), r = this.room, elapsed = Math.max(0, (now - r.lastTick) / 1e3), frame = this.pollMarket(r.g, elapsed);
    const ran = advanceMatch(r.g, elapsed, frame);
    if (ran) {
      r.lastTick += ran * 1e3;
      r.sequence++;
      this.dirty = true;
    }
    if (r.g.status === "ended") await this.finishMatch(r.g);
    else this.persistSoon();
  }
  async advanceSkirmish() {
    const now = Date.now(), r = this.room, elapsed = Math.max(0, (now - r.lastTick) / 1e3), g = r.authority.game, frame = this.pollMarket(g, elapsed);
    if (frame) r.authority.setMarket(frame);
    let remaining = Math.min(8, elapsed);
    const started = remaining;
    while (remaining > 1e-9 && g.status === "playing") {
      const step2 = Math.min(1, remaining);
      r.authority.advance(step2);
      remaining -= step2;
    }
    r.lastTick += (started - remaining) * 1e3;
    r.sequence = r.authority.sequence;
    if (started - remaining > 0) this.dirty = true;
    if (g.status === "ended") await this.finishMatch(g);
    else this.persistSoon();
  }
  packet(side, result = { ok: true }) {
    if (this.room.kind === "skirmish") {
      const snap = this.room.authority.snapshot(this.room.participants[side]);
      return { ...snap, ...result, id: this.room.row.id, matchId: this.room.row.id, transport: "realtime", actionId: result.actionId };
    }
    return envelope({ ...this.room.row, version: this.room.sequence }, this.room.g, side, result);
  }
  wire(packet) {
    return this.room?.kind === "skirmish" ? packet : packPacket(packet);
  }
  broadcast() {
    if (!this.room) return;
    for (const ws of this.ctx.getWebSockets()) {
      try {
        const a = ws.deserializeAttachment();
        ws.send(JSON.stringify(this.wire({ type: "snapshot", ...this.packet(a.side) })));
      } catch {
        try {
          ws.close(1011, "Reconnect to the room");
        } catch {
        }
      }
    }
  }
  async command(side, action) {
    const prior = this.room.g.commands?.find((c) => c.id === side + ":" + action.actionId);
    if (prior) return { ...this.packet(side, prior.result), actionId: action.actionId };
    await this.advance();
    const candidate = structuredClone(this.room), result = runCommand(candidate.g, side, action);
    candidate.sequence++;
    this.room = candidate;
    if (candidate.g.status === "ended") await this.finishMatch(candidate.g);
    else this.persistSoon();
    this.broadcast();
    return { ...this.packet(side, result), actionId: action.actionId };
  }
  async tacticsCommand(side, action) {
    await this.advance();
    const packet = { protocol: TACTICS_PROTOCOL, actionId: action.actionId, type: action.type };
    for (const key2 of ["slot", "x", "y"]) if (action[key2] !== void 0) packet[key2] = action[key2];
    const result = this.room.authority.receive(this.room.participants[side], packet);
    this.room.sequence = this.room.authority.sequence;
    if (this.room.authority.game.status === "ended") await this.finishMatch(this.room.authority.game);
    else this.persistSoon();
    this.broadcast();
    return { ...this.packet(side, result), actionId: action.actionId };
  }
  async fetch(request) {
    await this.ready;
    try {
      return await this.queue(async () => {
        const url = new URL(request.url), id = url.pathname.split("/")[2], operation = url.pathname.split("/")[3];
        await this.bootstrap(id);
        if (operation === "socket") {
          const claims = await verifyToken(url.searchParams.get("ticket"), this.env.REALTIME_SHARED_SECRET, { aud: "arena-room" });
          if (!claims || claims.match !== this.room.row.id || !sameSiteOrigin(claims.origin, this.env.SITE_ORIGIN) || !sameSiteOrigin(request.headers.get("Origin"), this.env.SITE_ORIGIN) || ![0, 1].includes(claims.side) || this.room.participants[claims.side] !== claims.player || typeof claims.jti !== "string") return json({ error: "Not a participant." }, 403);
          if (await this.ctx.storage.get("ticket:" + claims.jti)) return json({ error: "Connection ticket was already used." }, 409);
          await this.ctx.storage.put("ticket:" + claims.jti, claims.exp);
          this.room.connections ??= {};
          this.room.connections[claims.side] = claims.jti;
          await this.save();
          for (const old of this.ctx.getWebSockets("side:" + claims.side)) {
            try {
              old.close(4001, "A new connection replaced this one");
            } catch {
            }
          }
          const [client, server] = Object.values(new WebSocketPair());
          this.ctx.acceptWebSocket(server, ["side:" + claims.side]);
          server.serializeAttachment({ side: claims.side, player: claims.player, jti: claims.jti, window: Date.now(), count: 0 });
          await this.advance();
          server.send(JSON.stringify(this.wire({ type: "snapshot", ...this.packet(claims.side) })));
          this.schedule();
          return new Response(null, { status: 101, webSocket: client });
        }
        const raw = await request.text();
        if (!await verifyService(request, raw, this.env.REALTIME_SHARED_SECRET)) return json({ error: "Unauthorized." }, 401);
        const data = JSON.parse(raw), side = this.room.participants.indexOf(data.player);
        if (side < 0 || side !== data.side) return json({ error: "Not a participant." }, 403);
        if (operation === "command") return json(this.room.kind === "skirmish" ? await this.tacticsCommand(side, data.action) : await this.command(side, data.action));
        await this.advance();
        return json(this.packet(side));
      });
    } catch (error) {
      console.warn("Room request failed");
      return json({ error: "The room is reconnecting. Retry the same command ID." }, 503);
    }
  }
  async webSocketMessage(ws, message) {
    if (typeof message !== "string" || message.length > 1024) {
      ws.close(1009, "Message too large");
      return;
    }
    let data;
    try {
      data = JSON.parse(message);
    } catch {
      ws.close(1007, "Invalid JSON");
      return;
    }
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      ws.close(1007, "Invalid command object");
      return;
    }
    const a = ws.deserializeAttachment();
    if (!a) {
      ws.close(1008, "Not a participant");
      return;
    }
    const now = Date.now();
    if (now - a.window >= 1e3) {
      a.window = now;
      a.count = 0;
    }
    a.count++;
    ws.serializeAttachment(a);
    if (a.count > 12) {
      ws.send(JSON.stringify({ type: "error", protocol: this.room?.kind === "skirmish" ? TACTICS_PROTOCOL : void 0, actionId: data.actionId, error: "Too many commands. Wait a moment.", retry: true }));
      return;
    }
    if (data.type === "ping") {
      ws.send(JSON.stringify(this.room?.kind === "skirmish" ? { type: "pong", at: Number(data.at) || 0, protocol: TACTICS_PROTOCOL } : { type: "pong", at: Number(data.at) || 0 }));
      return;
    }
    return this.queue(async () => {
      if (this.room?.participants[a.side] !== a.player || this.room.connections?.[a.side] !== a.jti) {
        ws.close(1008, "Not a participant");
        return;
      }
      if (this.room.kind === "skirmish") {
        if (!TACTICS_COMMANDS.has(data.type) || typeof data.actionId !== "string" || !/^[\w-]{8,80}$/.test(data.actionId)) {
          ws.send(JSON.stringify({ type: "error", protocol: TACTICS_PROTOCOL, actionId: data.actionId, error: "Invalid command." }));
          return;
        }
        try {
          const packet = await this.tacticsCommand(a.side, data);
          ws.send(JSON.stringify({ type: "ack", ...packet }));
        } catch {
          ws.send(JSON.stringify({ type: "error", protocol: TACTICS_PROTOCOL, actionId: data.actionId, error: "The room is recovering. Your command will be retried.", retry: true }));
        }
        return;
      }
      if (!["deploy", "surrender"].includes(data.type) || typeof data.actionId !== "string" || !/^[a-zA-Z0-9-]{8,64}$/.test(data.actionId)) {
        ws.send(JSON.stringify({ type: "error", actionId: data.actionId, error: "Invalid command." }));
        return;
      }
      try {
        const packet = await this.command(a.side, data);
        ws.send(JSON.stringify(packPacket({ type: "ack", ...packet })));
      } catch {
        ws.send(JSON.stringify({ type: "error", actionId: data.actionId, error: "The room is recovering. Your command will be retried.", retry: true }));
      }
    });
  }
  async webSocketClose(ws, code, reason) {
    try {
      ws.close(code === 1006 ? 1011 : code, reason);
    } catch {
    }
  }
  async webSocketError(ws) {
    try {
      ws.close(1011, "Reconnect");
    } catch {
    }
  }
  async alarm() {
    await this.ready;
    return this.queue(async () => {
      await this.advance();
      this.broadcast();
      const outbox = await this.ctx.storage.get("outbox");
      if (outbox) {
        try {
          const result = await site(this.env, "settle", { id: outbox.id, state: outbox.state });
          if (result.recorded && result.settled) await this.ctx.storage.delete("outbox");
          else throw new Error("Settlement pending");
        } catch {
          outbox.attempts++;
          await this.ctx.storage.put("outbox", outbox);
          await this.ctx.storage.setAlarm(Date.now() + Math.min(6e4, 1e3 * 2 ** Math.min(outbox.attempts, 6)));
          return;
        }
      }
      const tickets = await this.ctx.storage.list({ prefix: "ticket:" }), expired = [];
      for (const [key2, expiry] of tickets) if (expiry < Date.now()) expired.push(key2);
      if (expired.length) await this.ctx.storage.delete(expired);
      if (this.playing()) {
        this.schedule();
        await this.ctx.storage.setAlarm(Date.now() + 5e3);
      } else if (this.room && Date.now() - this.room.createdAt > 864e5) await this.ctx.storage.deleteAll();
      else await this.ctx.storage.setAlarm(Date.now() + 36e5);
    });
  }
};

// ../../node_modules/.pnpm/wrangler@4.92.0_@cloudflare_63341bf59f3b888ceb88c3c39f548cc1/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../node_modules/.pnpm/wrangler@4.92.0_@cloudflare_63341bf59f3b888ceb88c3c39f548cc1/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-rfFYdv/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// ../../node_modules/.pnpm/wrangler@4.92.0_@cloudflare_63341bf59f3b888ceb88c3c39f548cc1/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-rfFYdv/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  MatchRoom,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=worker.js.map
