// FOLIO — stock-backed stablecoin (fUSD) + staked yield + 15-minute stock dividends + perps.
// BNB Chain. Dependency-free Node ≥18. Off-chain ledger, real Pyth oracle.
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');

const PORT = +process.env.PORT || 8188;
const ROOT = path.join(__dirname, '..');
const DATA_PATH = process.env.DATA_PATH || path.join(ROOT, 'data.json');
const FOLIO_MINT = process.env.FOLIO_MINT || '0x2c4e63ead1936ba1fe963fa3cb918a7b34de7777';
const TREASURY = (process.env.TREASURY || '0x3a0Ef3B70531Ae579810644CF287F82fD9BB9c8F').toLowerCase();
const TOKENS = { USDT: { addr: '0x55d398326f99059ff775485246999027b3197955', dec: 18 } };  // BSC-USDT (18 dp)
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
  DIVIDEND_SPLIT: 0.4,          // 40% stock airdrop / 30% locked LP / 30% buyback&burn (V2)
  PERP_TAKER_FEE: 0.0006, PERP_MAINT: 0.005, PERP_LIQ_FEE: 0.005,
  FUNDING_INTERVAL: 3600e3, FUNDING_K: 0.0001,
  START_FOLIO: 10000,           // paper $FOLIO allocation per wallet until FOLIO_MINT set
  // ---- V2 · The Compounding Update ----
  BUYBACK_SPLIT: 0.30,          // 30% of every epoch's revenue -> $FOLIO buyback & burn (stock 40% / LP 30% / burn 30%)
  LOCK_TERMS: { 30: 0.12, 90: 0.20, 180: 0.30, 365: 0.50 },   // days -> base APY on term-locked fUSD
  LOCK_EARLY_PENALTY: 0.10,     // early exit: 10% of principal burned
  BOOST_TIERS: [                // real on-chain $FOLIO holdings (share of supply) -> sfUSD/lock APY multiplier + points multiplier
    { name: 'Paper',   share: 0,       mult: 1.0 }, { name: 'Bronze',  share: 0.0001,  mult: 1.5 },
    { name: 'Silver',  share: 0.001,   mult: 2.0 }, { name: 'Gold',    share: 0.005,   mult: 2.5 }, { name: 'Diamond', share: 0.01, mult: 3.0 } ],
  BOOST_ABS: [0, 10000, 100000, 500000, 1000000],   // absolute $FOLIO fallback thresholds when supply unknown
  SEASON_POOL_SHARE: 0.05,      // Season 1 airdrop pool = 5% of $FOLIO supply
  SEASON_END: Date.UTC(2026, 10, 1),   // Season 1 ends 2026-11-01
  PTS: { stake: 1, lock: 3, sp: 2, debt: 1.5, trade: 0.5, dividend: 0.25 },  // points per $ per day (trade: per $100 notional)
  REF_BONUS: 0.10, STREAK_STEP: 0.05, STREAK_MAX: 0.50,
  BURN_MAX: 0.60, BURN_FULL_DEV: 0.20,   // V2.1 dynamic burn: share rises 30% → 60% linearly as $FOLIO trades up to 20% below its 7-day average (taken from the LP share)
  PX_WINDOW: 7 * 86400e3,
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
let FOLIO_PRICE = 0, FOLIO_LIQ = 0, FOLIO_PAIR = '';
// ---------- V2.1 · dynamic burn: price memory ----------
function pxSample(px) { if (!(px > 0)) return; db.pxHist = db.pxHist || []; const last = db.pxHist[db.pxHist.length - 1]; if (last && now() - last.t < 5 * 60e3) { last.p = px; return; } db.pxHist.push({ t: now(), p: px }); const cut = now() - P.PX_WINDOW; while (db.pxHist.length && db.pxHist[0].t < cut) db.pxHist.shift(); save(); }
function avg7() { const h = db.pxHist || []; if (!h.length) return 0; return h.reduce((a, x) => a + x.p, 0) / h.length; }
function burnShare() {   // 30% base; every 1% below 7d avg adds 1.5 pts, capped at 60% (20% below)
  const a = avg7(); if (!(a > 0) || !(FOLIO_PRICE > 0)) return { share: P.BUYBACK_SPLIT, avg: a, px: FOLIO_PRICE, dev: 0, samples: (db.pxHist || []).length };
  const dev = (a - FOLIO_PRICE) / a; const k = clamp(0, 1, dev / P.BURN_FULL_DEV); return { share: P.BUYBACK_SPLIT + (P.BURN_MAX - P.BUYBACK_SPLIT) * k, avg: a, px: FOLIO_PRICE, dev, samples: (db.pxHist || []).length };
}
async function pollFolio() {
  if (!FOLIO_MINT) return;
  try { const r = await fetch('https://api.dexscreener.com/latest/dex/tokens/' + FOLIO_MINT); if (!r.ok) return;
    const ps = ((await r.json()).pairs || []).filter((p) => p.chainId === 'bsc' && +p.priceUsd > 0).sort((a, b) => ((b.liquidity && b.liquidity.usd) || 0) - ((a.liquidity && a.liquidity.usd) || 0));
    if (ps[0]) { FOLIO_PRICE = +ps[0].priceUsd; FOLIO_LIQ = (ps[0].liquidity && ps[0].liquidity.usd) || 0; FOLIO_PAIR = ps[0].pairAddress || ''; pxSample(FOLIO_PRICE); } } catch (e) {}
}

// ---------- BNB Chain reader (real $FOLIO holder balances) ----------
const RPCS = (process.env.BSC_RPCS || 'https://bsc-rpc.publicnode.com,https://1rpc.io/bnb,https://bsc-dataseed.binance.org,https://bsc-dataseed1.defibit.io').split(',');
const CHAIN = { ok: false, rpc: '', supply: 0, decimals: 18, symbol: '', block: 0, holders: {}, checked: 0, lastRead: 0, errs: 0 };
async function rpc(method, params) {
  let err; for (let i = 0; i < RPCS.length; i++) { const u = RPCS[((CHAIN.rpcIdx || 0) + i) % RPCS.length];
    try { const ac = new AbortController(); const tm = setTimeout(() => ac.abort(), 6000);
      const r = await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: ac.signal }); clearTimeout(tm);
      const j = await r.json(); if (j.error) throw new Error(j.error.message); CHAIN.rpc = u; CHAIN.rpcIdx = RPCS.indexOf(u); return j.result; } catch (e) { err = e; CHAIN.errs++; } }
  throw err || new Error('rpc');
}
const hexToNum = (h, dec) => { if (!h || h === '0x') return 0; const bi = BigInt(h); const d = BigInt(10) ** BigInt(dec || 18); return Number(bi / d) + Number(bi % d) / Number(d); };
const call = (data) => rpc('eth_call', [{ to: FOLIO_MINT, data }, 'latest']);
async function chainMeta() {
  if (!FOLIO_MINT) return;
  try {
    const [sup, dec, blk] = await Promise.all([call('0x18160ddd'), call('0x313ce567'), rpc('eth_blockNumber', [])]);
    CHAIN.decimals = Number(BigInt(dec)); CHAIN.supply = hexToNum(sup, CHAIN.decimals); CHAIN.block = Number(BigInt(blk)); CHAIN.ok = CHAIN.supply > 0; CHAIN.lastRead = now();
    try { const sym = await call('0x95d89b41'); const hex = sym.slice(2); const len = parseInt(hex.slice(64, 128), 16); CHAIN.symbol = Buffer.from(hex.slice(128, 128 + len * 2), 'hex').toString('utf8'); } catch (e) {}
  } catch (e) { CHAIN.ok = false; }
}
async function chainBalance(w) {  // real ERC-20 balanceOf on BNB Chain
  const r = await call('0x70a08231' + w.slice(2).padStart(64, '0')); return hexToNum(r, CHAIN.decimals);
}
async function refreshHolders() {  // every connected wallet is re-read on-chain; dividends weight by REAL balance
  if (!CHAIN.ok) return; const ws = Object.keys(db.users); let n = 0;
  for (const w of ws) { try { const b = await chainBalance(w); const u = db.users[w]; if (u && u.folio !== b) { u.folio = b; DIRTY = true; } CHAIN.holders[w] = { bal: b, t: now() }; n++; } catch (e) {} }
  CHAIN.checked = n; CHAIN.lastRead = now();
}

// ---------- treasury deposits: real BNB / USDT sent to TREASURY, verified on-chain, credited to ledger ----------
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
async function creditDeposit(w, txHash) {
  if (!/^0x[a-fA-F0-9]{64}$/.test(txHash || '')) throw 'bad tx hash'; txHash = txHash.toLowerCase();
  db.txs = db.txs || {}; if (db.txs[txHash]) throw 'already credited';
  const [tx, rc] = await Promise.all([rpc('eth_getTransactionByHash', [txHash]), rpc('eth_getTransactionReceipt', [txHash])]);
  if (!tx) throw 'tx not found'; if (!rc) throw 'pending — try again in a few seconds'; if (rc.status !== '0x1') throw 'tx reverted';
  if ((tx.from || '').toLowerCase() !== w) throw 'tx not from your wallet';
  let sym, amt;
  if ((tx.to || '').toLowerCase() === TREASURY && BigInt(tx.value || '0x0') > 0n) { sym = 'BNB'; amt = hexToNum(tx.value, 18); }
  else {
    for (const lg of rc.logs || []) {
      const t = Object.entries(TOKENS).find(([, v]) => v.addr === (lg.address || '').toLowerCase()); if (!t || lg.topics[0] !== TRANSFER_TOPIC) continue;
      const from = '0x' + lg.topics[1].slice(26), to = '0x' + lg.topics[2].slice(26);
      if (from.toLowerCase() === w && to.toLowerCase() === TREASURY) { sym = t[0]; amt = hexToNum(lg.data, t[1].dec); break; }
    }
  }
  if (!sym || !(amt > 0)) throw 'no transfer to treasury found in this tx';
  const u = user(w); add(u, sym, amt); u.deposited = u.deposited || {}; u.deposited[sym] = (u.deposited[sym] || 0) + amt;
  db.txs[txHash] = { w, sym, amt, block: Number(BigInt(rc.blockNumber)), t: now() }; db.treasury = db.treasury || {}; db.treasury[sym] = (db.treasury[sym] || 0) + amt;
  ev('treasury', amt + ' ' + sym + ' deposited to treasury · ' + txHash.slice(0, 10) + '…', w); save();
  return { sym, amt, block: db.txs[txHash].block, tx: txHash };
}
async function treasuryBalances() {
  try { const bnb = hexToNum(await rpc('eth_getBalance', [TREASURY, 'latest']), 18);
    const usdt = hexToNum(await rpc('eth_call', [{ to: TOKENS.USDT.addr, data: '0x70a08231' + TREASURY.slice(2).padStart(64, '0') }, 'latest']), 18);
    const folio = FOLIO_MINT ? await chainBalance(TREASURY) : 0; CHAIN.treasury = { BNB: bnb, USDT: usdt, FOLIO: folio, t: now() }; } catch (e) {}
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
  funding: {}, liqs: [], perpFees: 0, events: [],
  locks: {}, burn: { fusd: 0, folio: 0, epochs: 0 }, season: { n: 1, total: 0, refs: 0 } };
try { db = Object.assign(db, JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'))); } catch (e) {}
let DIRTY = false; const save = () => { DIRTY = true; };
setInterval(() => { if (DIRTY) { DIRTY = false; try { fs.writeFileSync(DATA_PATH, JSON.stringify(db)); } catch (e) {} } }, 2500);
const ev = (k, m, w) => { db.events.unshift({ t: now(), k, m, w: w ? short(w) : undefined }); if (db.events.length > 200) db.events.pop(); };

function user(w) {
  w = w.toLowerCase();
  if (!db.users[w]) { db.users[w] = { wallet: w, bal: { ...STARTER, fUSD: 0 }, folio: CHAIN.ok ? 0 : P.START_FOLIO, sShares: 0, spShares: 0, divs: {}, pnl: 0, t: now(), pts: 0, ptsBreak: {}, ref: null, refPts: 0, streak: 0, lastCheck: 0, tradeVol: 0 }; ev('join', short(w) + ' joined'); save(); if (CHAIN.ok) chainBalance(w).then((b) => { db.users[w].folio = b; CHAIN.holders[w] = { bal: b, t: now() }; save(); }).catch(() => {}); }
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


// ---------- V2 · holder boost ----------
function boostOf(u) {
  const T = P.BOOST_TIERS; let tier = T[0], i = 0;
  if (CHAIN.ok && CHAIN.supply > 0) { const sh = (u.folio || 0) / CHAIN.supply; for (let k = 0; k < T.length; k++) if (sh >= T[k].share) { tier = T[k]; i = k; } }
  else { for (let k = 0; k < T.length; k++) if ((u.folio || 0) >= P.BOOST_ABS[k]) { tier = T[k]; i = k; } }
  const next = T[i + 1] || null;
  return { name: tier.name, mult: tier.mult, idx: i, next: next ? { name: next.name, mult: next.mult, need: CHAIN.ok && CHAIN.supply > 0 ? next.share * CHAIN.supply : P.BOOST_ABS[i + 1] } : null, apy: P.STAKE_TARGET_APY * tier.mult };
}
// sfUSD is a share token, so a staker's boost above 1x is credited as extra sfUSD shares minted to them each tick (pool grows by the same fUSD, funded from surplus).
function boostAccrue(dt) {
  for (const u of Object.values(db.users)) {
    if (!(u.sShares > 0)) continue; const b = boostOf(u); if (b.mult <= 1) continue;
    const val = u.sShares * stakePPS(); const extra = val * P.STAKE_TARGET_APY * (b.mult - 1) * dt / YEAR; if (!(extra > 0)) continue;
    const sh = extra / stakePPS(); u.sShares += sh; db.stake.shares += sh; db.stake.pool += extra; db.supply += extra; db.surplus -= extra; u.boostEarned = (u.boostEarned || 0) + extra;
  }
}
// ---------- V2 · term locks ----------
function lock(w, amt, days) {
  const u = user(w); amt = +amt; days = +days; if (!(amt >= 10)) throw 'min 10 fUSD'; if (!P.LOCK_TERMS[days]) throw 'term must be 30 / 90 / 180 / 365 days';
  if (bal(u, 'fUSD') < amt) throw 'insufficient fUSD'; add(u, 'fUSD', -amt);
  const id = 'L' + (db.seq++); db.locks[id] = { id, wallet: u.wallet, amt, days, apy: P.LOCK_TERMS[days], t: now(), until: now() + days * 86400e3, earned: 0, last: now() };
  ev('lock', `${amt.toFixed(2)} fUSD locked ${days}d @ ${(P.LOCK_TERMS[days] * 100).toFixed(0)}% base`, u.wallet); save(); return db.locks[id];
}
function unlock(w, id) {
  const L = db.locks[id]; if (!L || L.wallet !== w.toLowerCase()) throw 'no such lock'; const u = user(w); lockAccrue();
  const early = now() < L.until; const pen = early ? L.amt * P.LOCK_EARLY_PENALTY : 0; const out = L.amt + L.earned - pen;
  if (pen > 0) { db.supply -= pen; db.burn.fusd += pen; }   // penalty burned
  add(u, 'fUSD', out); delete db.locks[id]; ev('unlock', `${early ? 'EARLY exit · ' + pen.toFixed(2) + ' fUSD burned · ' : ''}${out.toFixed(2)} fUSD released`, u.wallet); save(); return { out, pen, early };
}
function lockAccrue() {
  const t = now();
  for (const L of Object.values(db.locks)) { const from = L.last, to = Math.min(t, L.until); L.last = t; if (to <= from) continue;
    const u = db.users[L.wallet]; const m = u ? boostOf(u).mult : 1; const y = L.amt * L.apy * m * (to - from) / YEAR; if (y > 0) { L.earned += y; db.supply += y; db.surplus -= y; } }
}
const lockView = (L) => { const u = db.users[L.wallet]; const m = u ? boostOf(u).mult : 1; return { ...L, boosted: L.apy * m, matured: now() >= L.until, value: L.amt + L.earned }; };
// ---------- V2 · Season points ----------
function ptsAdd(u, k, x) { if (!(x > 0)) return; const b = boostOf(u).mult; const st = 1 + Math.min(P.STREAK_MAX, (u.streak || 0) * P.STREAK_STEP); const v = x * b * st; u.pts = (u.pts || 0) + v; u.ptsBreak = u.ptsBreak || {}; u.ptsBreak[k] = (u.ptsBreak[k] || 0) + v; db.season.total += v;
  if (u.ref && db.users[u.ref]) { const r = db.users[u.ref]; const rv = v * P.REF_BONUS; r.pts = (r.pts || 0) + rv; r.refPts = (r.refPts || 0) + rv; r.ptsBreak = r.ptsBreak || {}; r.ptsBreak.referral = (r.ptsBreak.referral || 0) + rv; db.season.total += rv; } }
function pointsAccrue(dt) {
  if (now() > P.SEASON_END) return; const d = dt / 86400e3;
  const locksBy = {}; for (const L of Object.values(db.locks)) locksBy[L.wallet] = (locksBy[L.wallet] || 0) + L.amt * (L.days >= 365 ? 2 : L.days >= 180 ? 1.6 : L.days >= 90 ? 1.3 : 1);
  const debtBy = {}; for (const v of Object.values(db.vaults)) debtBy[v.wallet] = (debtBy[v.wallet] || 0) + v.debt;
  for (const u of Object.values(db.users)) {
    ptsAdd(u, 'stake', u.sShares * stakePPS() * P.PTS.stake * d); ptsAdd(u, 'lock', (locksBy[u.wallet] || 0) * P.PTS.lock * d);
    ptsAdd(u, 'stability', (db.sp.shares > 0 ? db.sp.pool * u.spShares / db.sp.shares : 0) * P.PTS.sp * d); ptsAdd(u, 'borrow', (debtBy[u.wallet] || 0) * P.PTS.debt * d);
  }
}
function checkin(w) { const u = user(w); const day = Math.floor(now() / 86400e3), last = Math.floor((u.lastCheck || 0) / 86400e3); if (day === last) throw 'already checked in today'; u.streak = day - last === 1 ? (u.streak || 0) + 1 : 1; u.lastCheck = now(); ptsAdd(u, 'checkin', 10); ev('checkin', `day ${u.streak} streak`, u.wallet); save(); return u.streak; }
function setRef(w, r) { const u = user(w); r = (r || '').toLowerCase(); if (!isWallet(r) || r === u.wallet) throw 'bad referrer'; if (u.ref) throw 'referrer already set'; user(r); u.ref = r; db.season.refs++; ptsAdd(u, 'referral', 50); ev('referral', `${short(u.wallet)} referred by ${short(r)}`); save(); }
function seasonView(u) {
  const users = Object.values(db.users).filter((x) => x.pts > 0).sort((a, b) => b.pts - a.pts); const pool = (CHAIN.ok ? CHAIN.supply : 1e9) * P.SEASON_POOL_SHARE;
  const rank = u ? users.findIndex((x) => x.wallet === u.wallet) + 1 : 0;
  return { n: db.season.n, end: P.SEASON_END, total: db.season.total, pool, refs: db.season.refs, players: users.length,
    board: users.slice(0, 20).map((x, i) => ({ rank: i + 1, w: short(x.wallet), pts: x.pts, tier: boostOf(x).name, est: db.season.total > 0 ? pool * x.pts / db.season.total : 0 })),
    me: u ? { pts: u.pts || 0, rank, share: db.season.total > 0 ? (u.pts || 0) / db.season.total : 0, est: db.season.total > 0 ? pool * (u.pts || 0) / db.season.total : 0, breakdown: u.ptsBreak || {}, streak: u.streak || 0, canCheck: Math.floor(now() / 86400e3) !== Math.floor((u.lastCheck || 0) / 86400e3), ref: u.ref, refPts: u.refPts || 0 } : null };
}

// ---------- dividend engine (The Index) ----------
const STOCK_ROTATION = ['NVDA', 'AAPL', 'GOOGL', 'HOOD', 'META', 'SPY'];
function revenue(x) { if (x > 0) db.div.revenue += x; }
function dividendTick() {
  const t = now(); if (!db.div.next) db.div.next = Math.ceil(t / P.DIVIDEND_EPOCH) * P.DIVIDEND_EPOCH; if (t < db.div.next) return;
  db.div.next += P.DIVIDEND_EPOCH; db.div.epoch++;
  const pot = db.div.revenue; db.div.revenue = 0; if (pot <= 0) { save(); return; }
  const BS = burnShare(); const toBurn = pot * BS.share, toLP = pot * (1 - P.DIVIDEND_SPLIT - BS.share), toStock = pot * P.DIVIDEND_SPLIT; db.div.lp += toLP;
  db.burn.fusd += toBurn; if (FOLIO_PRICE > 0) db.burn.folio += toBurn / FOLIO_PRICE; db.burn.epochs++; db.supply -= toBurn;
  const sym = STOCK_ROTATION[db.div.epoch % STOCK_ROTATION.length]; const px = PX[sym] || 0; if (!(px > 0)) { db.div.revenue += pot; return; }
  const shares = toStock / px; const holders = Object.values(db.users).filter((u) => u.folio > 0); const tot = holders.reduce((a, u) => a + u.folio, 0);
  for (const u of holders) { const s = shares * u.folio / tot; add(u, sym, s); u.divs[sym] = (u.divs[sym] || 0) + s; }
  db.div.paid += toStock; for (const u of holders) ptsAdd(u, 'dividend', toStock * u.folio / tot * P.PTS.dividend * 100);
  const rec = { t, epoch: db.div.epoch, sym, usd: toStock, shares, px, holders: holders.length, lp: toLP, burn: toBurn, burnShare: BS.share, folioPx: FOLIO_PRICE, avg7: BS.avg, block: CHAIN.block, weight: tot, onchain: CHAIN.ok };
  rec.receipt = crypto.createHash('sha256').update(JSON.stringify(rec)).digest('hex'); db.div.history.unshift(rec); if (db.div.history.length > 96) db.div.history.pop();
  ev('dividend', `epoch ${db.div.epoch}: ${toStock.toFixed(2)} of ${sym} airdropped to ${holders.length} holders · ${toLP.toFixed(2)} → LP · ${toBurn.toFixed(2)} → $FOLIO buyback & burn`); save();
}

// ---------- perps ----------
function pos(id) { return db.positions[id]; }
function posView(p) { const px = PX[p.sym]; const pnl = (px - p.entry) * p.size * (p.side === 'long' ? 1 : -1); const eq = p.margin + pnl - p.fundingPaid; const notional = p.size * px; return { ...p, px, pnl, eq, notional, mmReq: notional * P.PERP_MAINT, liqPx: p.side === 'long' ? p.entry - (p.margin - notional * P.PERP_MAINT) / p.size : p.entry + (p.margin - notional * P.PERP_MAINT) / p.size, roe: p.margin > 0 ? pnl / p.margin : 0 }; }
function openPerp(w, sym, side, margin, lev) {
  if (!PERPS[sym]) throw 'no such market'; const u = user(w); margin = +margin; lev = clamp(1, PERPS[sym], +lev || 1); if (!(margin >= 5)) throw 'min margin 5 fUSD';
  if (bal(u, 'fUSD') < margin) throw 'insufficient fUSD'; const px = PX[sym]; if (!(px > 0)) throw 'no price';
  const notional = margin * lev, fee = notional * P.PERP_TAKER_FEE; add(u, 'fUSD', -margin); db.perpFees += fee; db.surplus += fee; revenue(fee);
  const p = { id: 'p' + (db.seq++), wallet: u.wallet, sym, side, size: (notional - fee) / px, entry: px, margin: margin - fee, lev, t: now(), fundingPaid: 0 };
  db.positions[p.id] = p; u.tradeVol = (u.tradeVol || 0) + notional; ptsAdd(u, 'trade', notional / 100 * P.PTS.trade); ev('perp', `${side} ${sym} ${lev}× · ${notional.toFixed(0)} fUSD`, u.wallet); save(); return posView(p);
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
    supply: db.supply, tvl, backing: db.supply > 0 ? tvl / db.supply : 0, psm: db.psmUSDT, surplus: db.surplus, stake: { pool: db.stake.pool, pps: stakePPS(), apy: P.STAKE_TARGET_APY, maxApy: P.STAKE_TARGET_APY * P.BOOST_TIERS[P.BOOST_TIERS.length - 1].mult }, locks: { terms: P.LOCK_TERMS, tvl: Object.values(db.locks).reduce((a, L) => a + L.amt, 0), n: Object.keys(db.locks).length, penalty: P.LOCK_EARLY_PENALTY }, burn: { ...db.burn, dyn: burnShare(), max: P.BURN_MAX, base: P.BUYBACK_SPLIT }, tiers: P.BOOST_TIERS, season: seasonView(null), sp: { pool: db.sp.pool, gains: db.sp.gains },
    div: { ...db.div, next: db.div.next || 0, revenue: db.div.revenue }, perpOI, perpFees: db.perpFees, liqs: db.liqs.slice(0, 20), events: db.events.slice(0, 40), users: Object.keys(db.users).length, treasury: { addr: TREASURY, onchain: CHAIN.treasury || null, credited: db.treasury || {}, tokens: { USDT: TOKENS.USDT.addr } }, folio: { mint: FOLIO_MINT, price: FOLIO_PRICE, chain: { ok: CHAIN.ok, supply: CHAIN.supply, symbol: CHAIN.symbol, block: CHAIN.block, rpc: CHAIN.rpc, holdersRead: CHAIN.checked, lastRead: CHAIN.lastRead, decimals: CHAIN.decimals } } };
}
function meView(w) {
  const u = user(w); const vaults = Object.values(db.vaults).filter((v) => v.wallet === u.wallet).map((v) => { accrue(v); return vaultView(v); });
  const positions = Object.values(db.positions).filter((p) => p.wallet === u.wallet).map(posView);
  const sfusd = u.sShares * stakePPS(); const spVal = db.sp.shares > 0 ? db.sp.pool * u.spShares / db.sp.shares : 0;
  const locks = Object.values(db.locks).filter((L) => L.wallet === u.wallet).map(lockView);
  const nav = Object.entries(u.bal).reduce((a, [s, v]) => a + v * (s === 'fUSD' ? 1 : (PX[s] || 0)), 0) + vaults.reduce((a, v) => a + v.collValue - v.debt, 0) + sfusd + spVal + positions.reduce((a, p) => a + p.eq, 0) + locks.reduce((a, L) => a + L.value, 0);
  return { wallet: u.wallet, bal: u.bal, boost: boostOf(u), locks, lockVal: locks.reduce((a, L) => a + L.value, 0), boostEarned: u.boostEarned || 0, season: seasonView(u).me, deposited: u.deposited || {}, folio: u.folio, folioShare: CHAIN.supply > 0 ? u.folio / CHAIN.supply : 0, onchain: CHAIN.ok && !!CHAIN.holders[u.wallet], vaults, positions, sfusd, sShares: u.sShares, spVal, spShares: u.spShares, divs: u.divs, pnl: u.pnl, nav };
}

// ---------- http ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.json': 'application/json' };
const json = (res, c, o) => { res.writeHead(c, { 'content-type': 'application/json', 'cache-control': 'no-store', 'access-control-allow-origin': '*' }); res.end(JSON.stringify(o)); };
const body = (req) => new Promise((ok) => { let b = ''; req.on('data', (c) => { b += c; if (b.length > 1e5) req.destroy(); }); req.on('end', () => { try { ok(JSON.parse(b || '{}')); } catch (e) { ok({}); } }); });
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x'); const p = url.pathname;
  try {
    if (p === '/api/state') { const w = (url.searchParams.get('w') || '').toLowerCase(); return json(res, 200, { ...protocolView(), me: isWallet(w) ? meView(w) : null }); }
    if (p === '/api/holder') { const w = (url.searchParams.get('w') || '').toLowerCase(); if (!isWallet(w)) return json(res, 200, { error: 'wallet' }); try { const bal = await chainBalance(w); const u = db.users[w]; if (u) { u.folio = bal; save(); } CHAIN.holders[w] = { bal, t: now() }; return json(res, 200, { wallet: w, folio: bal, share: CHAIN.supply > 0 ? bal / CHAIN.supply : 0, block: CHAIN.block, rpc: CHAIN.rpc, mint: FOLIO_MINT }); } catch (e) { return json(res, 200, { error: 'chain read failed' }); } }
    if (p === '/api/proof') { const h = db.div.history; const fees = db.div.paid + db.div.lp + db.burn.fusd + db.div.revenue; return json(res, 200, { t: now(), chain: CHAIN.ok, block: CHAIN.block, rpc: CHAIN.rpc, mint: FOLIO_MINT, pair: FOLIO_PAIR, folio: { price: FOLIO_PRICE, liq: FOLIO_LIQ, supply: CHAIN.supply, symbol: CHAIN.symbol },
      treasury: { addr: TREASURY, onchain: CHAIN.treasury || null, credited: db.treasury || {}, txs: Object.entries(db.txs || {}).slice(-50).map(([h, x]) => ({ tx: h, ...x })) },
      fusd: { supply: db.supply, tvl: protocolView().tvl, psm: db.psmUSDT, surplus: db.surplus, staked: db.stake.pool, pps: stakePPS(), sp: db.sp.pool, locked: Object.values(db.locks).reduce((a, L) => a + L.amt, 0) },
      revenue: { allTime: fees, pendingEpoch: db.div.revenue, stockPaid: db.div.paid, lp: db.div.lp, burn: db.burn, epochs: db.div.epoch, burnEpochs: db.burn.epochs, dyn: burnShare(), base: P.BUYBACK_SPLIT, max: P.BURN_MAX },
      epochs: h, holders: Object.values(db.users).filter((u) => u.folio > 0).length, users: Object.keys(db.users).length, pxHist: db.pxHist || [] }); }
    if (p === '/api/season') { const w = (url.searchParams.get('w') || '').toLowerCase(); return json(res, 200, seasonView(isWallet(w) ? user(w) : null)); }
    if (p === '/api/dividends') return json(res, 200, { mint: FOLIO_MINT, chain: CHAIN.ok, epoch: db.div.epoch, next: db.div.next, paid: db.div.paid, lp: db.div.lp, history: db.div.history });
    if (p === '/x') { res.writeHead(302, { location: 'https://x.com/FolioBNB' }); return res.end(); }
    if (req.method === 'POST' && p.startsWith('/api/')) {
      const d = await body(req); const w = (d.wallet || '').toLowerCase(); if (!isWallet(w)) return json(res, 200, { error: 'connect a wallet first' });
      let r = null;
      switch (p) {
        case '/api/deposit': r = deposit(w, d.sym, d.amount); break;
        case '/api/treasury/credit': r = await creditDeposit(w, d.tx); break;
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
        case '/api/lock': r = lock(w, d.amount, d.days); break;
        case '/api/unlock': r = unlock(w, d.id); break;
        case '/api/checkin': r = checkin(w); break;
        case '/api/ref': setRef(w, d.ref); break;
        default: return json(res, 404, { error: 'unknown' });
      }
      return json(res, 200, { ok: true, r, me: meView(w) });
    }
    let fp = p === '/' ? '/index.html' : p === '/app' ? '/app.html' : p === '/docs' ? '/docs.html' : p === '/proof' ? '/proof.html' : p;
    fp = path.join(ROOT, 'client', path.normalize(fp).replace(/^(\.\.[\/\\])+/, ''));
    fs.readFile(fp, (err, buf) => { if (err) { res.writeHead(404); return res.end('not found'); } res.writeHead(200, { 'content-type': MIME[path.extname(fp)] || 'application/octet-stream' }); res.end(buf); });
  } catch (e) { json(res, 200, { error: String(e && e.message || e) }); }
}).listen(PORT, () => console.log('FOLIO · fUSD + stock dividends + perps · :' + PORT));

pollPyth(); pollFolio(); setInterval(pollPyth, 5000); setInterval(pollFolio, 60000);
chainMeta().then(refreshHolders).then(treasuryBalances); setInterval(treasuryBalances, 60000); setInterval(chainMeta, 60000); setInterval(refreshHolders, 120000);
let LAST_TICK = now();
setInterval(() => { if (!PRICE_OK) return; const dt = now() - LAST_TICK; LAST_TICK = now(); liquidations(); perpTick(); stakeAccrue(); boostAccrue(dt); lockAccrue(); pointsAccrue(dt); dividendTick(); save(); }, 3000);
