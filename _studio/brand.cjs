'use strict';
// FOLIO brand kit → brand/*.png.  node _studio/brand.cjs
const fs = require('fs'), path = require('path');
const { shot } = require('./rec.cjs');
const OUT = path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
const BRAND = path.join(__dirname, '..', 'brand'); fs.mkdirSync(BRAND, { recursive: true });

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;1,6..72,300&family=Hanken+Grotesk:wght@400;500;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">`;
const BASE = `
:root{--bg:#f8f6f2;--card:#fffdf9;--ink:#1c1b18;--ink2:#5a5852;--mut:#8f8b82;--rule:#e6e1d8;--gold:#b8933d;--gold2:#8f6f25;--goldl:#e6d5ab;--green:#2f6b4a;--red:#a83b2b}
*{margin:0;padding:0;box-sizing:border-box}
html,body{font-family:'Hanken Grotesk',system-ui,sans-serif;color:var(--ink);background:var(--bg);overflow:hidden}
.stage{position:relative;overflow:hidden;background:var(--bg)}
.stage:after{content:"";position:absolute;inset:0;pointer-events:none;opacity:.35;mix-blend-mode:multiply;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .18 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")}
.serif{font-family:'Newsreader',Georgia,serif;font-weight:300;letter-spacing:-.02em;line-height:1.02}
.serif em{font-style:italic;color:var(--gold2)}
.mono{font-family:'JetBrains Mono',monospace;font-variant-numeric:tabular-nums}
.caps{font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--gold2)}
.rule{height:1px;background:linear-gradient(90deg,var(--gold),transparent)}
.seal{color:var(--gold);stroke:var(--gold);fill:none;stroke-width:1.2;stroke-linecap:round;stroke-linejoin:round}
.dark{background:#1c1b18;color:#f8f6f2}.dark .serif em{color:#e6d5ab}.dark .caps{color:#e6d5ab}`;

const MONKEY = `<circle cx="32" cy="32" r="30" stroke-dasharray="1.5 3"/><circle cx="32" cy="32" r="26.5"/><circle cx="32" cy="29" r="11"/><circle cx="19.5" cy="28" r="4.2"/><circle cx="44.5" cy="28" r="4.2"/><path d="M24 31c1.5-6 5-9 8-9s6.5 3 8 9c-1.5 4.5-4.5 7.5-8 7.5s-6.5-3-8-7.5z"/><path d="M26.5 26.5c1-1 2.5-1.2 3.6-.6M33.9 25.9c1.1-.6 2.6-.4 3.6.6"/><circle cx="28.4" cy="28.8" r=".9" fill="currentColor"/><circle cx="35.6" cy="28.8" r=".9" fill="currentColor"/><path d="M31.2 33.2h1.6"/><path d="M32 40c-8 0-14 4-14 10M32 40c8 0 14 4 14 10M43 47c4-1 7 1 8 5s-2 6-5 4"/>`;
const HORSE = `<circle cx="32" cy="32" r="30" stroke-dasharray="1.5 3"/><circle cx="32" cy="32" r="26.5"/><path d="M18 52c2-14 6-24 14-30l3-8 3 7c6 1 10 6 13 15c1 3 1 5-1 7c-2 1-5 0-7-2c-3-2-6-2-8 0c-4 3-8 9-9 11"/><path d="M32 22c-3 2-5 5-6 9M35 21c-2 3-4 6-4 10M38 22c-2 3-3 6-3 9"/><circle cx="43" cy="30" r="1" fill="currentColor"/><path d="M48 39c.6.4 1 1 1 1.6"/><path d="M36 41c-2 1-4 3-5 5"/>`;
const seal = (which, size, sw = 1.2, style = '') => `<svg class="seal" width="${size}" height="${size}" viewBox="0 0 64 64" style="stroke-width:${sw};${style}">${which === 'h' ? HORSE : MONKEY}</svg>`;
// Twin-seal mark: monkey + horse overlapping (the FOLIO lockup)
const mark = (size) => `<div style="position:relative;width:${size * 1.55}px;height:${size}px">${seal('m', size, 1.1, `position:absolute;left:0;top:0`)}${seal('h', size, 1.1, `position:absolute;right:0;top:0`)}</div>`;

const page = (w, h, css, inner, dark = false) => `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>${BASE}.stage{width:${w}px;height:${h}px}${css}</style></head><body><div class="stage ${dark ? 'dark' : ''}">${inner}</div></body></html>`;
const A = {};

// PFP 2000² — twin seals, circle-safe
A['folio-pfp'] = [2000, 2000, page(2000, 2000, `.m{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:60px}.w{font-size:210px}`,
  `<div class="m">${mark(760)}<div class="serif w">Folio</div></div>`)];
// Wordmark 2400x800
A['folio-wordmark'] = [2400, 800, page(2400, 800, `.w{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:90px}.t b{font-weight:300;font-size:250px;line-height:1}.t small{display:block;font-size:30px;margin-top:20px}`,
  `<div class="w">${mark(400)}<div class="t"><b class="serif">Folio</b><small class="caps">a folio of stocks · a dollar that pays</small></div></div>`)];
// Banner 3000x1000
A['folio-banner'] = [3000, 1000, page(3000, 1000, `.l{position:absolute;left:180px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;max-width:1750px}.h{font-size:158px}.s{margin-top:44px;font-size:34px;color:var(--ink2)}.p{position:absolute;right:180px;bottom:84px;font-size:28px}.r{position:absolute;right:220px;top:50%;transform:translateY(-50%);opacity:.9}.ln{position:absolute;left:180px;right:180px;top:120px}`,
  `<div class="ln rule"></div><div class="r">${mark(560)}</div><div class="l"><div class="serif h">A folio of stocks.<br>A dollar that <em>pays you back.</em></div><div class="s mono">fUSD · sfUSD · stability pool · 15-min stock dividends · perps · BNB Chain</div></div><div class="p caps">foliobnb.xyz · $FOLIO</div>`)];
// OG 2400x1260
A['folio-og'] = [2400, 1260, page(2400, 1260, `.l{position:absolute;left:150px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;max-width:1450px}.h{font-size:150px}.s{margin-top:44px;font-size:36px;color:var(--ink2);line-height:1.45}.r{position:absolute;right:150px;top:50%;transform:translateY(-50%)}.f{position:absolute;left:150px;bottom:80px;font-size:28px}.ln{position:absolute;left:150px;right:150px;top:110px}`,
  `<div class="ln rule"></div><div class="r">${mark(520)}</div><div class="l"><div class="serif h">Your stocks,<br><em>working.</em></div><div class="s">Mint fUSD against tokenized equities & BNB. Stake it. Every 15 minutes, protocol revenue buys stock and pays $FOLIO holders.</div></div><div class="f caps">foliobnb.xyz</div>`)];
// Ledger explainer 2400x1350 — the five-step loop
const row = (n, name, desc, val, sub) => `<div class="lr"><span class="mono no">${n}</span><span class="serif nm">${name}</span><span class="ds">${desc}</span><span class="serif vl">${val}<small class="caps">${sub}</small></span></div>`;
A['folio-ledger'] = [2400, 1350, page(2400, 1350, `.w{position:absolute;inset:0;padding:110px 150px}.ey{font-size:28px;margin-bottom:26px}.h{font-size:104px;margin-bottom:64px}.lr{display:grid;grid-template-columns:90px 300px 1fr 360px;align-items:center;gap:40px;padding:34px 0;border-top:1px solid var(--rule)}.lr:last-child{border-bottom:1px solid var(--rule)}.no{color:var(--gold);font-size:26px}.nm{font-size:56px}.ds{font-size:29px;color:var(--ink2);line-height:1.4}.vl{font-size:64px;text-align:right}.vl small{display:block;font-size:20px;margin-top:4px}`,
  `<div class="w"><div class="ey caps">The ledger</div><div class="serif h">One dollar. <em>Five lines.</em></div>
  ${row('01', 'Hold', 'fUSD backed by tokenized equities, BNB and USDT. Redeemable 1:1 through the PSM.', '$1.00', 'target peg')}
  ${row('02', 'Stake', 'sfUSD accretes stability fees first, surplus buffer second. Exit fee burned.', '6.00%', 'est. apy')}
  ${row('03', 'Backstop', 'Stability pool burns bad debt and takes collateral 5% under oracle.', '5%', 'liq. discount')}
  ${row('04', 'Dividend', 'All protocol revenue: 50% buys stock at oracle → airdropped to $FOLIO holders. 50% locked LP.', '15 min', 'every epoch')}
  ${row('05', 'Trade', 'Perps on stocks & crypto with fUSD margin. Fees flow back into the dividend engine.', '25×', 'max leverage')}
  </div>`)];
// Markets 2400x1350 — collateral tiers (Arrow-style)
const tier = (t, ltv, liq, list) => `<div class="tc"><div class="caps" style="font-size:22px">${t}</div><div class="serif" style="font-size:88px;margin:14px 0 4px">${ltv}<span style="font-size:34px;color:var(--mut)"> ltv</span></div><div class="mono" style="font-size:24px;color:var(--ink2)">liq. ${liq}</div><div class="rule" style="margin:26px 0"></div><div class="serif" style="font-size:36px;line-height:1.5">${list}</div></div>`;
A['folio-markets'] = [2400, 1350, page(2400, 1350, `.w{position:absolute;inset:0;padding:110px 150px}.ey{font-size:28px;margin-bottom:26px}.h{font-size:104px;margin-bottom:60px}.g{display:grid;grid-template-columns:repeat(4,1fr);gap:34px}.tc{background:var(--card);border:1px solid var(--rule);padding:48px 44px;box-shadow:0 1px 0 var(--goldl)}.f{position:absolute;left:150px;bottom:80px;font-size:26px;color:var(--mut)}`,
  `<div class="w"><div class="ey caps">Collateral markets · isolated</div><div class="serif h">Tiered like a <em>prime broker.</em></div><div class="g">
  ${tier('Stables', '90%', '95%', 'USDT')}${tier('Majors', '75%', '82%', 'BNB')}${tier('Tier 1 equities', '55%', '65%', 'NVDA · AAPL<br>GOOGL · SPY')}${tier('Tier 2 equities', '40%', '52%', 'HOOD · META<br>TSLA')}
  </div><div class="f mono">Pyth oracles · 3.00% stability fee · 0.10% origination · liquidations at health &lt; 1.0</div></div>`)];
// Dark perps key-art 2400x1350
A['folio-perps'] = [2400, 1350, page(2400, 1350, `.w{position:absolute;inset:0;padding:110px 150px;display:flex;flex-direction:column}.ey{font-size:28px;margin-bottom:26px}.h{font-size:104px;margin-bottom:60px}.row{display:flex;gap:30px}.k{flex:1;border:1px solid rgba(230,213,171,.25);padding:44px 40px}.k b{display:block;font-size:84px;font-weight:300;font-family:'Newsreader',serif}.k span{display:block;font-size:20px;margin-top:8px;color:#e6d5ab}.k p{font-size:26px;color:rgba(248,246,242,.7);margin-top:24px;line-height:1.45}.f{margin-top:auto;font-size:26px;color:rgba(248,246,242,.55)}.r{position:absolute;right:130px;top:90px;opacity:.55}`,
  `<div class="r">${seal('h', 360, .7, 'stroke:#e6d5ab')}</div><div class="w"><div class="ey caps">Perpetuals · fUSD margin</div><div class="serif h">Trade the folio.<br><em>Fund the dividend.</em></div><div class="row">
  <div class="k"><b>25×</b><span>crypto · 10× stocks</span><p>Pyth mark, isolated margin, hourly funding — longs pay shorts when long OI dominates.</p></div>
  <div class="k"><b>0.06%</b><span>taker fee</span><p>Every perp fee lands in the revenue pot alongside origination, stability and liquidation fees.</p></div>
  <div class="k"><b>50 / 50</b><span>stock airdrop · locked LP</span><p>Each 15-minute epoch buys NVDA → AAPL → GOOGL → HOOD → META → SPY at oracle and pays $FOLIO holders pro-rata.</p></div>
  </div><div class="f mono">foliobnb.xyz · BNB Chain · $FOLIO</div></div>`, true)];

(async () => {
  for (const [n, [w, h, html]] of Object.entries(A)) {
    const f = path.join(OUT, n + '.html'); fs.writeFileSync(f, html);
    await shot(f, path.join(BRAND, n + '.png'), w, h);
  }
})().catch((e) => { console.error(e); process.exit(1); });
