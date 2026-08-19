'use strict';
// V2.1 announcement graphic → brand/folio-v21-proof.png.  node _studio/v21.cjs
const fs = require('fs'), path = require('path');
const { shot } = require('./rec.cjs');
const b = fs.readFileSync(path.join(__dirname, 'brand.cjs'), 'utf8');
const FONTS = b.match(/const FONTS = `([\s\S]*?)`;/)[1], BASE = b.match(/const BASE = `([\s\S]*?)`;/)[1];
const MONKEY = b.match(/const MONKEY = `([\s\S]*?)`;/)[1], HORSE = b.match(/const HORSE = `([\s\S]*?)`;/)[1];
// burn curve points: share vs deviation below 7d avg
const pts = []; for (let d = -10; d <= 30; d += 1) { const k = Math.max(0, Math.min(1, d / 20)); pts.push([d, 30 + 30 * k]); }
const X = (d) => 60 + (d + 10) / 40 * 520, Y = (s) => 250 - (s - 25) / 40 * 200;
const curve = pts.map(([d, s]) => X(d).toFixed(1) + ',' + Y(s).toFixed(1)).join(' ');
const html = `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>${BASE}
.stage{width:1600px;height:900px;padding:56px 64px;display:flex;flex-direction:column}
.hd{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:26px}
.hd h1{font-size:62px;max-width:1250px}.hd .caps{font-size:12px;margin-bottom:12px;display:block}
.seals svg{width:64px;height:64px;margin-left:10px}
.ft{display:flex;justify-content:space-between;margin-top:auto;font-size:13px;color:var(--mut)}.ft b{color:var(--ink);font-weight:500}
.card{background:var(--card);border:1px solid var(--rule);padding:26px 30px}
.card h3{font-family:'Newsreader',serif;font-weight:300;font-size:32px;letter-spacing:-.02em;margin-bottom:6px}
.card p{font-size:16px;color:var(--ink2);line-height:1.45}
.big{font-family:'Newsreader',serif;font-weight:300;font-size:64px;letter-spacing:-.02em;line-height:1}
.g{color:var(--gold2)}.r{color:#c9563f}
.row{display:flex;justify-content:space-between;padding:9px 0;border-top:1px solid var(--rule);font-size:15px}.row span:last-child{font-family:'JetBrains Mono';color:var(--ink)}
.on{display:inline-block;padding:3px 9px;border-radius:4px;font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;background:var(--gold2);color:#fff}
.ld{display:inline-block;padding:3px 9px;border-radius:4px;font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;border:1px solid var(--goldl);color:var(--gold2)}
</style></head><body><div class="stage">
<div class="hd"><div><span class="caps">V2.1 · dynamic burn + proof</span><h1 class="serif">The burn now scales with weakness. <em>And every number has a page.</em></h1></div><div class="seals"><svg class="seal" viewBox="0 0 64 64">${MONKEY}</svg><svg class="seal" viewBox="0 0 64 64">${HORSE}</svg></div></div>
<div style="display:grid;grid-template-columns:1.15fr 1fr;gap:26px">
 <div class="card" style="border-color:var(--gold)"><span class="caps" style="font-size:11px">Dynamic buyback &amp; burn</span><h3>30% base → <span class="r">60%</span> when $FOLIO trades 20% below its 7-day average</h3>
  <svg viewBox="0 0 640 290" style="width:100%;height:auto;margin-top:8px;font-family:'JetBrains Mono'">
   <line x1="60" y1="250" x2="580" y2="250" stroke="#e6e1d8"/><line x1="60" y1="50" x2="60" y2="250" stroke="#e6e1d8"/>
   ${[30,40,50,60].map(s=>`<line x1="60" x2="580" y1="${Y(s)}" y2="${Y(s)}" stroke="#e6e1d8" stroke-dasharray="2 4"/><text x="50" y="${Y(s)+4}" font-size="11" fill="#8f8b82" text-anchor="end">${s}%</text>`).join('')}
   ${[-10,0,10,20,30].map(d=>`<text x="${X(d)}" y="270" font-size="11" fill="#8f8b82" text-anchor="middle">${d<=0?(d===0?'at avg':'+'+(-d)+'%'):'−'+d+'%'}</text>`).join('')}
   <line x1="${X(0)}" x2="${X(0)}" y1="50" y2="250" stroke="#b8933d" stroke-dasharray="3 3"/><text x="${X(0)+6}" y="62" font-size="11" fill="#8f6f25">7-day average</text>
   <polyline points="${curve}" fill="none" stroke="#c9563f" stroke-width="3"/>
   <circle cx="${X(0)}" cy="${Y(30)}" r="5" fill="#b8933d"/><circle cx="${X(20)}" cy="${Y(60)}" r="5" fill="#c9563f"/>
   <text x="${X(20)+10}" y="${Y(60)-12}" font-size="12" fill="#c9563f">60% · max burn</text>
   <text x="${X(0)-10}" y="${Y(30)+20}" font-size="12" fill="#8f6f25" text-anchor="end">30% · base</text>
   <text x="320" y="288" font-size="11" fill="#8f8b82" text-anchor="middle">$FOLIO price vs. 7-day average</text>
  </svg>
  <p style="margin-top:6px">Read at the top of every 15-minute epoch from the live market price. The extra comes out of the LP share; the 40% stock airdrop to holders never shrinks. <b>The protocol buys hardest when the chart is weakest.</b> The share used is written into each epoch's receipt.</p>
 </div>
 <div class="card"><span class="caps" style="font-size:11px">foliobnb.xyz/proof · live</span><h3>Verify, don't trust.</h3>
  <div class="row"><span>Treasury balances · BNB / USDT / $FOLIO</span><span class="on">on-chain</span></div>
  <div class="row"><span>Deposits · tx-verified before credit</span><span class="on">on-chain</span></div>
  <div class="row"><span>Holder weights · ERC-20 balanceOf</span><span class="on">on-chain</span></div>
  <div class="row"><span>Collateral &amp; perp marks · Pyth</span><span class="on">oracle</span></div>
  <div class="row"><span>Fees in → stock / LP / burn, all-time</span><span class="ld">receipted</span></div>
  <div class="row"><span>Every 15-min epoch · block-pinned SHA-256</span><span class="ld">receipted</span></div>
  <div class="row"><span>Live dynamic-burn meter + 7-day chart</span><span class="ld">live</span></div>
  <div class="row" style="border-bottom:1px solid var(--rule)"><span>What is on-chain vs. ledger — stated plainly</span><span class="ld">stated</span></div>
  <p style="margin-top:14px">One page. Treasury wallet linked to BscScan. Every receipt, every tx, every dollar in and out. JSON at <span style="font-family:'JetBrains Mono'">/api/proof</span>.</p>
 </div>
</div>
<div class="ft"><span>Nest pitched trust. The Index pitched cadence. Folio shows the wallet.</span><span><b>foliobnb.xyz/proof</b> · $FOLIO · BNB Chain</span></div>
</div></body></html>`;
const f = path.join(__dirname, 'out', 'folio-v21.html'); fs.writeFileSync(f, html);
shot(f, path.join(__dirname, '..', 'brand', 'folio-v21-proof.png'), 1600, 900).then(() => console.log('ok')).catch(e => { console.error(e); process.exit(1); });
