'use strict';
// Update recap vs Nest → brand/folio-recap-vs-nest.png.  node _studio/recap.cjs
const fs = require('fs'), path = require('path');
const { shot } = require('./rec.cjs');
const b = fs.readFileSync(path.join(__dirname, 'brand.cjs'), 'utf8');
const FONTS = b.match(/const FONTS = `([\s\S]*?)`;/)[1], BASE = b.match(/const BASE = `([\s\S]*?)`;/)[1];
const MONKEY = b.match(/const MONKEY = `([\s\S]*?)`;/)[1], HORSE = b.match(/const HORSE = `([\s\S]*?)`;/)[1];
const Y = '<span class="y">✓</span>', N = '<span class="n">—</span>';
const rows = [
  ['Stock-collateral stablecoin', Y + ' fUSD · BNB Chain', Y + ' nUSD · Solana', 'V1'],
  ['Staked yield', Y + ' 6% → <b>18%</b> holder-boosted', '6% target', 'V2'],
  ['15-min stock dividends to holders', Y + ' NVDA · AAPL · GOOGL · HOOD · META · SPY', N, 'V1'],
  ['Stability pool backstop', Y, N, 'V1'],
  ['Perps margined in the stable', Y + ' up to 25×', N, 'V1'],
  ['Holder boost tiers', Y + ' <b>1.5× → 3×</b> on every yield, read on-chain', N, 'V2'],
  ['Term locks', Y + ' 12 → 50% base · <b>to 150%</b>', N, 'V2'],
  ['Season points · airdrop', Y + ' <b>5% of supply</b> · referrals 10% forever', N, 'V2'],
  ['Token buyback &amp; burn', Y + ' <b>30% of revenue</b>, every 15 min', N, 'V2'],
  ['Dynamic burn', Y + ' <b>→ 60%</b> when price &lt; 7-day avg', N, 'V2.1'],
  ['Public proof page', Y + ' treasury · receipts · burn meter', N, 'V2.1'],
];
const html = `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>${BASE}
.stage{width:1600px;height:1000px;padding:52px 64px;display:flex;flex-direction:column}
.hd{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:22px}
.hd h1{font-size:58px;max-width:1250px}.hd .caps{font-size:12px;margin-bottom:10px;display:block}
.seals svg{width:64px;height:64px;margin-left:10px}
table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--rule)}
th,td{padding:12px 20px;text-align:left;border-bottom:1px solid var(--rule);font-size:18px}
th{font-family:'Newsreader',serif;font-weight:300;font-size:32px;letter-spacing:-.02em;padding-top:18px;padding-bottom:6px;vertical-align:bottom}
th small{display:block;font-family:'Hanken Grotesk';font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--mut);font-weight:700;margin-top:4px}
th .ath{font-family:'JetBrains Mono';font-size:15px;color:var(--gold2);display:block;margin-top:2px}
td:first-child{color:var(--ink2);font-weight:500;width:360px}
td.f{background:rgba(184,147,61,.08);color:var(--ink)}th.f{background:rgba(184,147,61,.12)}
td.v{width:80px;text-align:right}.v span{font-family:'JetBrains Mono';font-size:11px;padding:3px 8px;border:1px solid var(--goldl);color:var(--gold2);border-radius:4px}.v span.new{background:var(--gold2);color:#fff;border-color:var(--gold2)}
.y{color:var(--green);font-weight:700}.n{color:var(--mut)}
b{font-weight:700;color:var(--gold2)}
.ft{display:flex;justify-content:space-between;margin-top:auto;font-size:13px;color:var(--mut)}.ft b{color:var(--ink);font-weight:500}
</style></head><body><div class="stage">
<div class="hd"><div><span class="caps">Three weeks of shipping · V1 → V2 → V2.1</span><h1 class="serif">Nest hit $18M on one idea. <em>Folio shipped eleven.</em></h1></div>
<div class="seals"><svg class="seal" viewBox="0 0 64 64">${MONKEY}</svg><svg class="seal" viewBox="0 0 64 64">${HORSE}</svg></div></div>
<table><thead><tr><th></th><th class="f">Folio<span class="ath">$FOLIO · live now</span><small>bnb chain · foliobnb.xyz</small></th><th>Nest<span class="ath">ATH ≈ $18M mcap</span><small>stock-collateral stable · solana</small></th><th style="text-align:right"><small>shipped</small></th></tr></thead>
<tbody>${rows.map(r => `<tr><td>${r[0]}</td><td class="f">${r[1]}</td><td>${r[2]}</td><td class="v"><span class="${r[3] !== 'V1' ? 'new' : ''}">${r[3]}</span></td></tr>`).join('')}</tbody></table>
<div class="ft"><span>Folio's collateral model descends from Nest. Everything below the first line is new — and every number is on <b>foliobnb.xyz/proof</b>.</span><span><b>foliobnb.xyz</b> · $FOLIO · BNB Chain</span></div>
</div></body></html>`;
const f = path.join(__dirname, 'out', 'folio-recap.html'); fs.writeFileSync(f, html);
shot(f, path.join(__dirname, '..', 'brand', 'folio-recap-vs-nest.png'), 1600, 1000).then(() => console.log('ok')).catch(e => { console.error(e); process.exit(1); });
