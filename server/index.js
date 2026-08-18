// FOLIO — stock-backed stablecoin (fUSD) + staked yield + 15-minute stock dividends + perps.
// BNB Chain. Dependency-free Node ≥18. Off-chain ledger, real Pyth oracle.
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');

const PORT = +process.env.PORT || 8188;
const ROOT = path.join(__dirname, '..');
const DATA_PATH = process.env.DATA_PATH || path.join(ROOT, 'data.json');
const FOLIO_MINT = process.env.FOLIO_MINT || '';
const now = () => Date.now();
const isWallet = (s) => /^0x[a-fA-F0-9]{40}$/.test(s || '');
const short = (w) => (w || '').slice(0, 6) + '…' + (w || '').slice(-4);
const clamp = (lo, hi, v) => Math.max(lo, Math.min(hi, v));
const YEAR = 365 * 86400e3;

// ---------- protocol parameters ----------
const P = {
  STABILITY_APR: 0.03,          // borrow fee, continuous
  ORIGINATION: 0.001,           // 0.1% one-time on mint
  STAKE_TARGET_APY: 0.06,       // sfUSD target
  STAKE_EXIT_FEE: 0.06 / 365,   // one day of target APR, burned
  LIQ_DISCOUNT: 0.05,           // stability pool buys collateral 5% under oracle
  DIVIDEND_EPOCH: 15 * 60e3,    // The Index cadence
  DIVIDEND_SPLIT: 0.5,          // 50% stock airdrop / 50% locked LP
  PERP_TAKER_FEE: 0.0006, PERP_MAINT: 0.005, PERP_LIQ_FEE: 0.005,
  FUNDING_INTERVAL: 3600e3, FUNDING_K: 0.0001,
  START_FOLIO: 10000,           // paper $FOLIO allocation per wallet until FOLIO_MINT set
};

// ---------- oracle ----------
const PYTH = 'https://hermes.pyth.network/v2/updates/price/latest';
const FEED = {
  BTC: 'e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43', ETH: 'ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace', BNB: '2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f', SOL: 'ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
  HOOD: 'f6a467733ed71ee41f7e50132b14cff1d6857554a40d8a92c63859d1bcd64e57', NVDA: '61c4ca5b9731a79e285a01e24432d57d89f0ecdd4cd7828196ca8992d5eafef6', TSLA: '16dad506d7db8da01c87581c87ca897a012a153557d4d578c3b9c9e1bc0632f1',
  SPY: '5374a7d76a45ae2443cef351d10482b7bcc6ef5a928e75030d63b5fb3abe7cb5', COIN: '5c3bd92f2eed33779040caea9f82fac705f5121d26251f8f5e17ec35b9559cd4', MSTR: 'e1e80251e5f5184f2195008382538e847fafc36f751896889dd3d1b1f6111f09',
  AAPL: '49f6b65cb1de6b10eaf75e7c03ca029c306d0357e91b5311b175084a5ad55688', GOOGL: 'e65ff435be42630439c96396653a342829e877e2aafaeaf1a10d0ee5fd2cf3f2',
  META: '78a3e3b8e676a8f73c439f5d749737034b139bbbe899ba5775216fba596607fe', GLD: 'e190f467043db04548200354889dfe0d9d314c08b8d4e62fabf4d5a3140fecca',
};
const PX = { USDT: 1 }; let PRICE_OK = false;
async function pollPyth() {
  try {
    const q = Object.values(FEED).map((i) => 'ids[]=' + i).join('&');
    const r = await fetch(PYTH + '?' + q, { headers: { accept: 'application/json' } }); if (!r.ok) return;
    for (const p of (await r.json()).parsed || []) {
      const sym = Object.keys(FEED).find((s) => FEED[s] === p.id.replace(/^0x/, ''));
      const v = Number(p.price.price) * Math.pow(10, p.price.expo); if (sym && v > 0) PX[sym] = v;
    }
    PRICE_OK = true;
  } catch (e) {}
}
let FOLIO_PRICE = 0;
async function pollFolio() {
  if (!FOLIO_MINT) return;
  try { const r = await fetch('https://api.dexscreener.com/latest/dex/tokens/' + FOLIO_MINT); if (!r.ok) return;
    const ps = ((await r.json()).pairs || []).filter((p) => p.chainId === 'bsc' && +p.priceUsd > 0).sort((a, b) => ((b.liquidity && b.liquidity.usd) || 0) - ((a.liquidity && a.liquidity.usd) || 0));
    if (ps[0]) FOLIO_PRICE = +ps[0].priceUsd; } catch (e) {}
}

// ---------- collateral markets (Arrow tiers) ----------
const MARKETS = {
  USDT:  { tier: 'Stable',   ltv: 0.90, liq: 0.95, cap: 5e6 },
  BNB:   { tier: 'Crypto',   ltv: 0.75, liq: 0.82, cap: 5e6 },
  SPY:   { tier: 'ETF',      ltv: 0.55, liq: 0.65, cap: 3e6 },
  GLD:   { tier: 'ETF',      ltv: 0.55, liq: 0.65, cap: 3e6 },
  HOOD:  { tier: 'Tier 1',   ltv: 0.55, liq: 0.65, cap: 3e6 },
  NVDA:  { tier: 'Tier 1',   ltv: 0.55, liq: 0.65, cap: 3e6 },
  AAPL:  { tier: 'Tier 1',   ltv: 0.55, liq: 0.65, cap: 3e6 },
  GOOGL: { tier: 'Tier 1',   ltv: 0.55, liq: 0.65, cap: 3e6 },
  META:  { tier: 'Tier 1',   ltv: 0.55, liq: 0.65, cap: 3e6 },
  TSLA:  { tier: 'Tier 2',   ltv: 0.40, liq: 0.52, cap: 2e6 },
  COIN:  { tier: 'Tier 2',   ltv: 0.40, liq: 0.52, cap: 2e6 },
  MSTR:  { tier: 'Tier 2',   ltv: 0.40, liq: 0.52, cap: 2e6 },
};
const PERPS = { BTC: 25, ETH: 25, BNB: 25, SOL: 25, HOOD: 10, NVDA: 10, TSLA: 10, SPY: 10, COIN: 10, MSTR: 10, AAPL: 10, GOOGL: 10, META: 10, GLD: 10 };
const STARTER = { USDT: 2500, BNB: 3, HOOD: 20, NVDA: 5, SPY: 2, TSLA: 3, GLD: 3 };  // paper starter portfolio

// ---------- state ----------
let db = { users: {}, vaults: {}, positions: {}, seq: 1,
  supply: 0, psmUSDT: 0, surplus: 0,                              // fUSD supply, PSM reserve, surplus buffer (fees, fUSD)
  stake: { pool: 0, shares: 0, accrued: 0 },                       // sfUSD: fUSD pool + shares
  sp: { pool: 0, shares: 0, gains: {} },                           // stability pool: fUSD + collateral gains
  div: { revenue: 0, epoch: 0, lp: 0, paid: 0, history: [] },      // dividend engine
  funding: {}, liqs: [], perpFees: 0, events: [] };
try { db = Object.assign(db, JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'))); } catch (e) {}
let DIRTY = false; const save = () => { DIRTY = true; };
setInterval(() => { if (DIRTY) { DIRTY = false; try { fs.writeFileSync(DATA_PATH, JSON.stringify(db)); } catch (e) {} } }, 2500);
const ev = (k, m, w) => { db.events.unshift({ t: now(), k, m, w: w ? short(w) : undefined }); if (db.events.length > 200) db.events.pop(); };

function user(w) {
  w = w.toLowerCase();
  if (!db.users[w]) { db.users[w] = { wallet: w, bal: { ...STARTER, fUSD: 0 }, folio: P.START_FOLIO, sShares: 0, spShares: 0, divs: {}, pnl: 0, t: now() }; ev('join', short(w) + ' joined'); save(); }
  return db.users[w];
}
const bal = (u, s) => u.bal[s] || 0;
const add = (u, s, v) => { u.bal[s] = (u.bal[s] || 0) + v; if (u.bal[s] < 1e-12) u.bal[s] = 0; };

// ---------- vaults (CDP) ----------
const vid = (w, sym) => w + ':' + sym;
function accrue(v) { const dt = now() - v.t; if (v.debt > 0 && dt > 0) { const f = v.debt * P.STABILITY_APR * dt / YEAR; v.debt += f; v.fees += f; db.stake.accrued += f; } v.t = now(); }
function vaultView(v) { const px = PX[v.sym] || 0, m = MARKETS[v.sym]; const cv = v.coll * px; const hf = v.debt > 0 ? cv * m.liq / v.debt : Infinity; return { ...v, px, collValue: cv, hf, maxMint: Math.max(0, cv * m.ltv - v.debt), liqPrice: v.debt > 0 && v.coll > 0 ? v.debt / (v.coll * m.liq) : 0 }; }
function deposit(w, sym, amt) {
  if (!MARKETS[sym]) throw 'unknown market'; amt = +amt; if (!(amt > 0)) throw 'amount';
  const u = user(w); if (bal(u, sym) < amt) throw 'insufficient ' + sym;
  const v = db.vaults[vid(u.wallet, sym)] || (db.vaults[vid(u.wallet, sym)] = { wallet: u.wallet, sym, coll: 0, debt: 0, fees: 0, t: now() });
  accrue(v); add(u, sym, -amt); v.coll += amt; ev('deposit', `${amt} ${sym} → vault`, u.wallet); save(); return vaultView(v);
}
function mint(w, sym, amt) {
  const u = user(w), v = db.vaults[vid(u.wallet, sym)]; if (!v) throw 'no vault'; accrue(v); amt = +amt; if (!(amt > 0)) throw 'amount';
  const vv = vaultView(v); if (amt > vv.maxMint + 1e-9) throw 'exceeds LTV · max ' + vv.maxMint.toFixed(2) + ' fUSD';
  const fee = amt * P.ORIGINATION; v.debt += amt; add(u, 'fUSD', amt - fee); db.supply += amt; db.surplus += fee; revenue(fee);
  ev('mint', `${amt.toFixed(2)} fUSD against ${sym}`, u.wallet); save(); return vaultView(v);
}
function repay(w, sym, amt) {
  const u = user(w), v = db.vaults[vid(u.wallet, sym)]; if (!v) throw 'no vault'; accrue(v); amt = Math.min(+amt, v.debt); if (!(amt > 0)) throw 'amount';
  if (bal(u, 'fUSD') < amt) throw 'insufficient fUSD'; add(u, 'fUSD', -amt);
  const feePart = Math.min(amt, v.fees); v.fees -= feePart; db.surplus += feePart; revenue(feePart); v.debt -= amt; db.supply -= (amt - feePart);
  ev('repay', `${amt.toFixed(2)} fUSD on ${sym}`, u.wallet); save(); return vaultView(v);
}
function withdraw(w, sym, amt) {
  const u = user(w), v = db.vaults[vid(u.wallet, sym)]; if (!v) throw 'no vault'; accrue(v); amt = Math.min(+amt, v.coll); if (!(amt > 0)) throw 'amount';
  const m = MARKETS[sym]; const cvAfter = (v.coll - amt) * PX[sym]; if (v.debt > 0 && cvAfter * m.ltv < v.debt) throw 'would breach LTV';
  v.coll -= amt; add(u, sym, amt); if (v.coll === 0 && v.debt === 0) delete db.vaults[vid(u.wallet, sym)]; ev('withdraw', `${amt} ${sym}`, u.wallet); save(); return v.coll ? vaultView(v) : null;
}
function psm(w, dir, amt) {   // dir: 'in' USDT→fUSD, 'out' fUSD→USDT
  const u = user(w); amt = +amt; if (!(amt > 0)) throw 'amount';
  if (dir === 'in') { if (bal(u, 'USDT') < amt) throw 'insufficient USDT'; add(u, 'USDT', -amt); add(u, 'fUSD', amt); db.psmUSDT += amt; db.supply += amt; }
  else { if (bal(u, 'fUSD') < amt) throw 'insufficient fUSD'; if (db.psmUSDT < amt) throw 'PSM has ' + db.psmUSDT.toFixed(2) + ' USDT idle'; add(u, 'fUSD', -amt); add(u, 'USDT', amt); db.psmUSDT -= amt; db.supply -= amt; }
  ev('psm', `${amt} ${dir === 'in' ? 'USDT → fUSD' : 'fUSD → USDT'}`, u.wallet); save();
}
// liquidation via stability pool
function liquidations() {
  for (const v of Object.values(db.vaults)) {
    if (v.debt <= 0) continue; accrue(v); const vv = vaultView(v); if (vv.hf >= 1) continue;
    const m = MARKETS[v.sym]; const debt = v.debt; const collNeeded = Math.min(v.coll, debt / (PX[v.sym] * (1 - P.LIQ_DISCOUNT)));
    if (db.sp.pool >= debt) {                                  // stability pool absorbs
      db.sp.pool -= debt; db.sp.gains[v.sym] = (db.sp.gains[v.sym] || 0) + collNeeded; db.supply -= debt;
      const rest = v.coll - collNeeded; const u = user(v.wallet); if (rest > 0) add(u, v.sym, rest);
      db.liqs.unshift({ t: now(), w: short(v.wallet), sym: v.sym, debt, coll: collNeeded, mode: 'stability pool' });
      ev('liquidation', `${short(v.wallet)} ${v.sym} vault · ${debt.toFixed(2)} fUSD absorbed by stability pool`);
      delete db.vaults[vid(v.wallet, v.sym)];
    } else {                                                   // surplus buffer backstop: write down
      const u = user(v.wallet); const seized = v.coll * PX[v.sym]; db.surplus -= Math.max(0, debt - seized); db.supply -= debt;
      db.liqs.unshift({ t: now(), w: short(v.wallet), sym: v.sym, debt, coll: v.coll, mode: 'surplus buffer' }); ev('liquidation', `${short(v.wallet)} ${v.sym} vault · backstopped by surplus buffer`);
      delete db.vaults[vid(v.wallet, v.sym)];
    }
    if (db.liqs.length > 50) db.liqs.pop(); save();
  }
}

// ---------- sfUSD staking ----------
const stakePPS = () => db.stake.shares > 0 ? db.stake.pool / db.stake.shares : 1;
function stakeAccrue() {  // move accrued stability fees + target-APY top-up from surplus into the pool
  const need = db.stake.pool * P.STAKE_TARGET_APY * (now() - (db.stake.t || now())) / YEAR; db.stake.t = now();
  const fromFees = Math.min(db.stake.accrued, need); db.stake.accrued -= fromFees; let pay = fromFees;
  const gap = need - fromFees; const fromSurplus = Math.min(Math.max(0, db.surplus), gap); db.surplus -= fromSurplus; pay += fromSurplus;
  if (pay > 0) { db.stake.pool += pay; db.supply += pay; }
}
function stake(w, amt) { const u = user(w); amt = +amt; if (!(amt > 0)) throw 'amount'; if (bal(u, 'fUSD') < amt) throw 'insufficient fUSD'; stakeAccrue(); const sh = amt / stakePPS(); add(u, 'fUSD', -amt); u.sShares += sh; db.stake.pool += amt; db.stake.shares += sh; ev('stake', `${amt.toFixed(2)} fUSD → sfUSD`, u.wallet); save(); }
function unstake(w, sh) { const u = user(w); sh = Math.min(+sh, u.sShares); if (!(sh > 0)) throw 'amount'; stakeAccrue(); const val = sh * stakePPS(); const fee = val * P.STAKE_EXIT_FEE; u.sShares -= sh; db.stake.shares -= sh; db.stake.pool -= val; db.supply -= fee; add(u, 'fUSD', val - fee); ev('unstake', `${(val - fee).toFixed(2)} fUSD (${fee.toFixed(4)} burned)`, u.wallet); save(); }
// ---------- stability pool ----------
const spPPS = () => db.sp.shares > 0 ? db.sp.pool / db.sp.shares : 1;
function spDeposit(w, amt) { const u = user(w); amt = +amt; if (!(amt > 0)) throw 'amount'; if (bal(u, 'fUSD') < amt) throw 'insufficient fUSD'; const sh = db.sp.shares > 0 ? amt / spPPS() : amt; add(u, 'fUSD', -amt); u.spShares += sh; db.sp.pool += amt; db.sp.shares += sh; ev('sp', `${amt.toFixed(2)} fUSD → stability pool`, u.wallet); save(); }
function spWithdraw(w, sh) { const u = user(w); sh = Math.min(+sh, u.spShares); if (!(sh > 0)) throw 'amount'; const frac = sh / db.sp.shares; const val = db.sp.pool * frac;
  for (const s of Object.keys(db.sp.gains)) { const g = db.sp.gains[s] * frac; db.sp.gains[s] -= g; add(u, s, g); }
  u.spShares -= sh; db.sp.shares -= sh; db.sp.pool -= val; add(u, 'fUSD', val); ev('sp', `withdrew ${val.toFixed(2)} fUSD + collateral gains`, u.wallet); save(); }

// ---------- dividend engine (The Index) ----------
const STOCK_ROTATION = ['NVDA', 'AAPL', 'GOOGL', 'HOOD', 'META', 'SPY'];
function revenue(x) { if (x > 0) db.div.revenue += x; }
function dividendTick() {
  const t = now(); if (!db.div.next) db.div.next = Math.ceil(t / P.DIVIDEND_EPOCH) * P.DIVIDEND_EPOCH; if (t < db.div.next) return;
  db.div.next += P.DIVIDEND_EPOCH; db.div.epoch++;
  const pot = db.div.revenue; db.div.revenue = 0; if (pot <= 0) { save(); return; }
  const toLP = pot * (1 - P.DIVIDEND_SPLIT), toStock = pot * P.DIVIDEND_SPLIT; db.div.lp += toLP;
  const sym = STOCK_ROTATION[db.div.epoch % STOCK_ROTATION.length]; const px = PX[sym] || 0; if (!(px > 0)) { db.div.revenue += pot; return; }
  const shares = toStock / px; const holders = Object.values(db.users).filter((u) => u.folio > 0); const tot = holders.reduce((a, u) => a + u.folio, 0);
  for (const u of holders) { const s = shares * u.folio / tot; add(u, sym, s); u.divs[sym] = (u.divs[sym] || 0) + s; }
  db.div.paid += toStock; db.div.history.unshift({ t, epoch: db.div.epoch, sym, usd: toStock, shares, px, holders: holders.length, lp: toLP }); if (db.div.history.length > 96) db.div.history.pop();
  ev('dividend', `epoch ${db.div.epoch}: $${toStock.toFixed(2)} of ${sym} airdropped to ${holders.length} holders · $${toLP.toFixed(2)} → locked LP`); save();
}

// ---------- perps ----------
function pos(id) { return db.positions[id]; }
function posView(p) { const px = PX[p.sym]; const pnl = (px - p.entry) * p.size * (p.side === 'long' ? 1 : -1); const eq = p.margin + pnl - p.fundingPaid; const notional = p.size * px; return { ...p, px, pnl, eq, notional, mmReq: notional * P.PERP_MAINT, liqPx: p.side === 'long' ? p.entry - (p.margin - notional * P.PERP_MAINT) / p.size : p.entry + (p.margin - notional * P.PERP_MAINT) / p.size, roe: p.margin > 0 ? pnl / p.margin : 0 }; }
function openPerp(w, sym, side, margin, lev) {
  if (!PERPS[sym]) throw 'no such market'; const u = user(w); margin = +margin; lev = clamp(1, PERPS[sym], +lev || 1); if (!(margin >= 5)) throw 'min margin 5 fUSD';
  if (bal(u, 'fUSD') < margin) throw 'insufficient fUSD'; const px = PX[sym]; if (!(px > 0)) throw 'no price';
  const notional = margin * lev, fee = notional * P.PERP_TAKER_FEE; add(u, 'fUSD', -margin); db.perpFees += fee; db.surplus += fee; revenue(fee);
  const p = { id: 'p' + (db.seq++), wallet: u.wallet, sym, side, size: (notional - fee) / px, entry: px, margin: margin - fee, lev, t: now(), fundingPaid: 0 };
  db.positions[p.id] = p; ev('perp', `${side} ${sym} ${lev}× · ${notional.toFixed(0)} fUSD`, u.wallet); save(); return posView(p);
}
function closePerp(w, id, reason) {
  const p = pos(id); if (!p || p.wallet !== w.toLowerCase()) throw 'no such position'; const v = posView(p); const u = user(w); const px = PX[p.sym];
  const fee = v.notional * P.PERP_TAKER_FEE; db.perpFees += fee; db.surplus += fee; revenue(fee); const out = Math.max(0, v.eq - fee); add(u, 'fUSD', out); u.pnl += out - p.margin;
  delete db.positions[id]; ev('perp', `${reason || 'closed'} ${p.side} ${p.sym} · pnl ${(out - p.margin) >= 0 ? '+' : ''}${(out - p.margin).toFixed(2)}`, u.wallet); save(); return { out, pnl: out - p.margin };
}
function perpTick() {
  const t = now();
  for (const p of Object.values(db.positions)) {
    const v = posView(p);
    if (v.eq <= v.mmReq) {   // liquidate
      const u = user(p.wallet); const fee = v.notional * P.PERP_LIQ_FEE; const left = Math.max(0, v.eq - fee); db.surplus += Math.min(fee, Math.max(0, v.eq)); revenue(Math.min(fee, Math.max(0, v.eq))); add(u, 'fUSD', left); u.pnl += left - p.margin;
      db.liqs.unshift({ t, w: short(p.wallet), sym: p.sym, mode: 'perp ' + p.side, debt: v.notional, coll: p.margin }); if (db.liqs.length > 50) db.liqs.pop();
      ev('liquidation', `${short(p.wallet)} ${p.side} ${p.sym} perp liquidated`); delete db.positions[p.id]; save();
    }
  }
  // funding: hourly, longs pay shorts when long OI > short OI (and vice-versa)
  for (const sym of Object.keys(PERPS)) {
    const f = db.funding[sym] || (db.funding[sym] = { next: Math.ceil(t / P.FUNDING_INTERVAL) * P.FUNDING_INTERVAL, rate: 0 });
    const ps = Object.values(db.positions).filter((p) => p.sym === sym); const L = ps.filter((p) => p.side === 'long').reduce((a, p) => a + p.size * PX[sym], 0), S = ps.filter((p) => p.side === 'short').reduce((a, p) => a + p.size * PX[sym], 0);
    f.rate = (L + S) > 0 ? clamp(-0.001, 0.001, P.FUNDING_K * (L - S) / (L + S) * 10) : 0; f.longOI = L; f.shortOI = S;
    if (t >= f.next) { f.next += P.FUNDING_INTERVAL; for (const p of ps) { const pay = p.size * PX[sym] * f.rate * (p.side === 'long' ? 1 : -1); p.fundingPaid += pay; } save(); }
  }
}

// ---------- views ----------
function protocolView() {
  const vaults = Object.values(db.vaults).map(vaultView); const tvl = vaults.reduce((a, v) => a + v.collValue, 0) + db.psmUSDT;
  const byMkt = {}; for (const s of Object.keys(MARKETS)) byMkt[s] = { ...MARKETS[s], px: PX[s] || 0, coll: 0, debt: 0 }; for (const v of vaults) { byMkt[v.sym].coll += v.coll; byMkt[v.sym].debt += v.debt; }
  const perpOI = Object.values(db.positions).reduce((a, p) => a + p.size * (PX[p.sym] || 0), 0);
  return { t: now(), ok: PRICE_OK, px: PX, params: P, markets: byMkt, perps: Object.keys(PERPS).map((s) => ({ sym: s, px: PX[s] || 0, maxLev: PERPS[s], funding: db.funding[s] || { rate: 0, longOI: 0, shortOI: 0 } })),
    supply: db.supply, tvl, backing: db.supply > 0 ? tvl / db.supply : 0, psm: db.psmUSDT, surplus: db.surplus, stake: { pool: db.stake.pool, pps: stakePPS(), apy: P.STAKE_TARGET_APY }, sp: { pool: db.sp.pool, gains: db.sp.gains },
    div: { ...db.div, next: db.div.next || 0, revenue: db.div.revenue }, perpOI, perpFees: db.perpFees, liqs: db.liqs.slice(0, 20), events: db.events.slice(0, 40), users: Object.keys(db.users).length, folio: { mint: FOLIO_MINT, price: FOLIO_PRICE } };
}
function meView(w) {
  const u = user(w); const vaults = Object.values(db.vaults).filter((v) => v.wallet === u.wallet).map((v) => { accrue(v); return vaultView(v); });
  const positions = Object.values(db.positions).filter((p) => p.wallet === u.wallet).map(posView);
  const sfusd = u.sShares * stakePPS(); const spVal = db.sp.shares > 0 ? db.sp.pool * u.spShares / db.sp.shares : 0;
  const nav = Object.entries(u.bal).reduce((a, [s, v]) => a + v * (s === 'fUSD' ? 1 : (PX[s] || 0)), 0) + vaults.reduce((a, v) => a + v.collValue - v.debt, 0) + sfusd + spVal + positions.reduce((a, p) => a + p.eq, 0);
  return { wallet: u.wallet, bal: u.bal, folio: u.folio, vaults, positions, sfusd, sShares: u.sShares, spVal, spShares: u.spShares, divs: u.divs, pnl: u.pnl, nav };
}

// ---------- http ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.json': 'application/json' };
const json = (res, c, o) => { res.writeHead(c, { 'content-type': 'application/json', 'cache-control': 'no-store', 'access-control-allow-origin': '*' }); res.end(JSON.stringify(o)); };
const body = (req) => new Promise((ok) => { let b = ''; req.on('data', (c) => { b += c; if (b.length > 1e5) req.destroy(); }); req.on('end', () => { try { ok(JSON.parse(b || '{}')); } catch (e) { ok({}); } }); });
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x'); const p = url.pathname;
  try {
    if (p === '/api/state') { const w = (url.searchParams.get('w') || '').toLowerCase(); return json(res, 200, { ...protocolView(), me: isWallet(w) ? meView(w) : null }); }
    if (p === '/x') { res.writeHead(302, { location: 'https://x.com/FolioBNB' }); return res.end(); }
    if (req.method === 'POST' && p.startsWith('/api/')) {
      const d = await body(req); const w = (d.wallet || '').toLowerCase(); if (!isWallet(w)) return json(res, 200, { error: 'connect a wallet first' });
      let r = null;
      switch (p) {
        case '/api/deposit': r = deposit(w, d.sym, d.amount); break;
        case '/api/mint': r = mint(w, d.sym, d.amount); break;
        case '/api/repay': r = repay(w, d.sym, d.amount); break;
        case '/api/withdraw': r = withdraw(w, d.sym, d.amount); break;
        case '/api/psm': psm(w, d.dir, d.amount); break;
        case '/api/stake': stake(w, d.amount); break;
        case '/api/unstake': unstake(w, d.shares); break;
        case '/api/sp/deposit': spDeposit(w, d.amount); break;
        case '/api/sp/withdraw': spWithdraw(w, d.shares); break;
        case '/api/perp/open': r = openPerp(w, d.sym, d.side, d.margin, d.lev); break;
        case '/api/perp/close': r = closePerp(w, d.id); break;
        default: return json(res, 404, { error: 'unknown' });
      }
      return json(res, 200, { ok: true, r, me: meView(w) });
    }
    let fp = p === '/' ? '/index.html' : p === '/app' ? '/app.html' : p === '/docs' ? '/docs.html' : p;
    fp = path.join(ROOT, 'client', path.normalize(fp).replace(/^(\.\.[\/\\])+/, ''));
    fs.readFile(fp, (err, buf) => { if (err) { res.writeHead(404); return res.end('not found'); } res.writeHead(200, { 'content-type': MIME[path.extname(fp)] || 'application/octet-stream' }); res.end(buf); });
  } catch (e) { json(res, 200, { error: String(e && e.message || e) }); }
}).listen(PORT, () => console.log('FOLIO · fUSD + stock dividends + perps · :' + PORT));

pollPyth(); pollFolio(); setInterval(pollPyth, 5000); setInterval(pollFolio, 60000);
setInterval(() => { if (!PRICE_OK) return; liquidations(); perpTick(); stakeAccrue(); dividendTick(); }, 3000);
