'use strict';
// Folio vs Nest vs The Index comparison → brand/folio-vs-nest-index.png.  node _studio/cmp.cjs
const fs = require('fs'), path = require('path');
const { shot } = require('./rec.cjs');
const b = fs.readFileSync(path.join(__dirname, 'brand.cjs'), 'utf8');
const FONTS = b.match(/const FONTS = `([\s\S]*?)`;/)[1], BASE = b.match(/const BASE = `([\s\S]*?)`;/)[1];
const MONKEY = b.match(/const MONKEY = `([\s\S]*?)`;/)[1], HORSE = b.match(/const HORSE = `([\s\S]*?)`;/)[1];
const Y = '<span class="y">✓</span>', N = '<span class="n">—</span>';
const rows = [
  ['Chain', 'BNB Chain', 'Solana', 'Robinhood Chain'],
  ['Stock-collateral stablecoin', Y + ' fUSD', Y + ' nUSD', N],
  ['Staked yield', '<b>6% → 18%</b> holder-boosted', '6% target', N],
  ['Stability pool backstop', Y, N, N],
  ['Stock dividends to holders', Y + ' every 15 min', N, Y + ' every 15 min'],
  ['Perps margined in the stable', Y + ' up to 25×', N, N],
  ['Term locks', '<b>12 → 50%</b> base · to 150%', N, N],
  ['Holder boost tiers', '<b>1.5× → 3×</b> on all yield', N, N],
  ['Token buyback & burn', '<b>30%</b> of all revenue', N, N],
  ['Points season / airdrop', '<b>5%</b> of supply', N, N],
];
const html = `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>${BASE}
.stage{width:1600px;height:1000px;padding:56px 64px}
.hd{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:26px}
.hd h1{font-size:64px}.hd .caps{font-size:12px;margin-bottom:12px;display:block}
.seals svg{width:64px;height:64px;margin-left:10px}
table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--rule)}
th,td{padding:15px 22px;text-align:left;border-bottom:1px solid var(--rule);font-size:20px}
th{font-family:'Newsreader',serif;font-weight:300;font-size:34px;letter-spacing:-.02em;padding-top:22px;padding-bottom:6px;vertical-align:bottom}
th small{display:block;font-family:'Hanken Grotesk';font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--mut);font-weight:700;margin-top:6px}
th .ath{font-family:'JetBrains Mono';font-size:15px;color:var(--gold2);display:block;margin-top:2px}
td:first-child{color:var(--ink2);font-weight:500;width:330px}
td.f{background:rgba(184,147,61,.08);color:var(--ink)}th.f{background:rgba(184,147,61,.12)}
.y{color:var(--green);font-weight:700}.n{color:var(--mut)}
b{font-weight:700;color:var(--gold2)}
.ft{display:flex;justify-content:space-between;margin-top:22px;font-size:13px;color:var(--mut)}
.ft b{color:var(--ink);font-weight:500}
</style></head><body><div class="stage">
<div class="hd"><div><span class="caps">Against the lineage · V2</span><h1 class="serif">The two it was built from, <em>and what it adds.</em></h1></div>
<div class="seals"><svg class="seal" viewBox="0 0 64 64">${MONKEY}</svg><svg class="seal" viewBox="0 0 64 64">${HORSE}</svg></div></div>
<table><thead><tr><th></th><th class="f">Folio<span class="ath">$FOLIO · V2 live</span><small>collateral model + dividends + perps</small></th><th>Nest<span class="ath">ATH ≈ $18M mcap</span><small>stock-collateral stable · solana</small></th><th>The Index<span class="ath">ATH ≈ $5M mcap</span><small>15-minute stock dividends · robinhood chain</small></th></tr></thead>
<tbody>${rows.map(r => `<tr><td>${r[0]}</td><td class="f">${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join('')}</tbody></table>
<div class="ft"><span>Folio draws its collateral model from <b>Nest</b> and its 15-minute dividend engine from <b>The Index</b> — then adds a stability pool, perps, and V2: boost, locks, burn, season.</span><span><b>foliobnb.xyz</b> · $FOLIO · BNB Chain</span></div>
</div></body></html>`;
const f = path.join(__dirname, 'out', 'folio-cmp.html'); fs.writeFileSync(f, html);
shot(f, path.join(__dirname, '..', 'brand', 'folio-vs-nest-index.png'), 1600, 1000).then(() => console.log('ok')).catch(e => { console.error(e); process.exit(1); });
