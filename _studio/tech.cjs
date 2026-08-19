'use strict';
// V2 tech explainer graphics → brand/folio-tech-{flywheel,boost,burn}.png.  node _studio/tech.cjs
const fs = require('fs'), path = require('path');
const { shot } = require('./rec.cjs');
const b = fs.readFileSync(path.join(__dirname, 'brand.cjs'), 'utf8');
const FONTS = b.match(/const FONTS = `([\s\S]*?)`;/)[1], BASE = b.match(/const BASE = `([\s\S]*?)`;/)[1];
const MONKEY = b.match(/const MONKEY = `([\s\S]*?)`;/)[1], HORSE = b.match(/const HORSE = `([\s\S]*?)`;/)[1];
const CSS = `${BASE}
.stage{width:1600px;height:900px;padding:56px 64px;display:flex;flex-direction:column}
.hd{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:30px}
.hd h1{font-size:60px;max-width:1250px}.hd .caps{font-size:12px;margin-bottom:12px;display:block}
.seals svg{width:64px;height:64px;margin-left:10px}
.ft{display:flex;justify-content:space-between;margin-top:auto;font-size:13px;color:var(--mut)}.ft b{color:var(--ink);font-weight:500}
.card{background:var(--card);border:1px solid var(--rule);padding:26px 30px}
.card h3{font-family:'Newsreader',serif;font-weight:300;font-size:34px;letter-spacing:-.02em;margin-bottom:6px}
.card p{font-size:17px;color:var(--ink2);line-height:1.45}
.big{font-family:'Newsreader',serif;font-weight:300;font-size:64px;letter-spacing:-.02em;line-height:1}
.g{color:var(--gold2)}.r{color:#c9563f}.gr{color:var(--green)}
`;
const wrap = (kicker, title, body, foot) => `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>${CSS}</style></head><body><div class="stage">
<div class="hd"><div><span class="caps">${kicker}</span><h1 class="serif">${title}</h1></div><div class="seals"><svg class="seal" viewBox="0 0 64 64">${MONKEY}</svg><svg class="seal" viewBox="0 0 64 64">${HORSE}</svg></div></div>
${body}<div class="ft"><span>${foot}</span><span><b>foliobnb.xyz</b> · $FOLIO · BNB Chain</span></div></div></body></html>`;

// 1 · flywheel
const fly = wrap('V2 · the flywheel', 'Every fee feeds four engines. <em>Holding $FOLIO multiplies three of them.</em>', `
<div style="display:grid;grid-template-columns:1.1fr 1fr;gap:28px;align-items:stretch">
 <div class="card" style="display:flex;flex-direction:column;justify-content:space-between">
  <div><span class="caps" style="font-size:11px">Revenue in</span><h3>Origination · stability fee · perp taker · liquidation</h3><p>Every action in the protocol — mint, borrow, trade, liquidate — lands in one pot. Nothing is skimmed by a team wallet.</p></div>
  <div style="margin:22px 0;height:1px;background:var(--rule)"></div>
  <div><span class="caps" style="font-size:11px">Every 15 minutes, the pot splits</span>
   <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:12px">
    <div style="border:1px solid var(--rule);padding:16px"><div class="big g">40%</div><p style="margin-top:6px">buys real tokenized stock at oracle, airdropped to $FOLIO holders</p></div>
    <div style="border:1px solid var(--rule);padding:16px"><div class="big">30%</div><p style="margin-top:6px">deepens locked FOLIO liquidity</p></div>
    <div style="border:1px solid var(--rule);padding:16px"><div class="big r">30%</div><p style="margin-top:6px">buys back &amp; burns $FOLIO — supply only goes down</p></div>
   </div></div>
 </div>
 <div style="display:grid;grid-template-rows:repeat(3,1fr);gap:16px">
  <div class="card"><span class="caps" style="font-size:11px">Engine 1 · sfUSD</span><h3>6% base → <span class="g">18%</span> boosted</h3><p>Stake fUSD, hold $FOLIO on-chain, your personal APY scales 1.5× → 3×.</p></div>
  <div class="card"><span class="caps" style="font-size:11px">Engine 2 · term locks</span><h3>12 → 50% base → <span class="g">150%</span> Diamond</h3><p>Fixed-term fUSD. Yield every 3 seconds. Early exit burns 10%.</p></div>
  <div class="card"><span class="caps" style="font-size:11px">Engine 3 · Season 1</span><h3><span class="g">5%</span> of supply · points × tier</h3><p>Every working dollar earns. Referrals pay 10% forever. Streaks to +50%.</p></div>
 </div>
</div>`, 'More activity → bigger pot → more stock airdropped, more $FOLIO burned → holding $FOLIO worth more → more boost → more activity.');

// 2 · boost math
const tiers = [['Paper','—','1×','6%','50%','1×'],['Bronze','0.01% supply','1.5×','9%','75%','1.5×'],['Silver','0.1% supply','2×','12%','100%','2×'],['Gold','0.5% supply','2.5×','15%','125%','2.5×'],['Diamond','1% supply','3×','18%','150%','3×']];
const boost = wrap('V2 · holder boost', 'Your on-chain balance is the multiplier. <em>Read live. Applied to everything.</em>', `
<div style="display:grid;grid-template-columns:1.25fr 1fr;gap:28px">
 <table style="width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--rule);align-self:start"><thead><tr style="font-family:'Hanken Grotesk';font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--mut)"><th style="text-align:left;padding:14px 20px">Tier</th><th style="text-align:right;padding:14px 20px">Hold</th><th style="text-align:right;padding:14px 20px">Multiplier</th><th style="text-align:right;padding:14px 20px">sfUSD APY</th><th style="text-align:right;padding:14px 20px">365d lock</th><th style="text-align:right;padding:14px 20px">Points</th></tr></thead>
 <tbody>${tiers.map((t,i)=>`<tr style="font-size:22px;${i===4?'background:rgba(184,147,61,.12)':''}"><td style="padding:18px 20px;border-top:1px solid var(--rule);font-family:'Newsreader',serif;font-size:30px">${t[0]}</td>${t.slice(1).map((c,j)=>`<td style="padding:18px 20px;border-top:1px solid var(--rule);text-align:right;font-family:'JetBrains Mono';${j>=1?'color:var(--gold2)':''}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table>
 <div style="display:flex;flex-direction:column;gap:16px">
  <div class="card"><span class="caps" style="font-size:11px">How it's read</span><h3>balanceOf on BNB Chain, every 2 min</h3><p>No snapshot, no staking of the token, no lock. Buy $FOLIO, hold it in the connected wallet, the tier updates itself. Sell it and the tier drops.</p></div>
  <div class="card"><span class="caps" style="font-size:11px">Worked example · Diamond</span><p style="font-family:'JetBrains Mono';font-size:15px;line-height:1.7;margin-top:6px">10,000 fUSD staked → <b class="g">1,800 fUSD/yr</b> (was 600)<br>10,000 fUSD locked 365d → <b class="g">15,000 fUSD/yr</b> (was 5,000)<br>Season points → <b class="g">×3</b> on every line</p></div>
  <div class="card" style="border-color:var(--gold)"><h3>Why it's different</h3><p>Every other stable protocol pays the same rate to everyone. Folio pays the most to the people who hold the token — demand for $FOLIO is written into the yield curve itself.</p></div>
 </div>
</div>`, 'sfUSD stays a single share token: boost is minted as extra sfUSD shares to the holder every 3-second tick, funded from protocol surplus.');

// 3 · burn
const burn = wrap('V2 · buyback &amp; burn', '30% of all revenue buys back $FOLIO. <em>Every 15 minutes. Forever.</em>', `
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-bottom:20px">
 <div class="card"><span class="caps" style="font-size:11px">Old split · V1</span><div class="big" style="margin:8px 0">50 / 50</div><p>Half to stock airdrop, half to locked LP. Zero supply pressure on the token.</p></div>
 <div class="card" style="border-color:var(--gold)"><span class="caps" style="font-size:11px">New split · V2</span><div class="big" style="margin:8px 0"><span class="g">40</span> / 30 / <span class="r">30</span></div><p>Stock airdrop / locked LP / <b class="r">$FOLIO buyback &amp; burn</b>. Plus every early-lock-exit penalty is burned too.</p></div>
 <div class="card"><span class="caps" style="font-size:11px">Cadence</span><div class="big" style="margin:8px 0">96×<span style="font-size:28px"> / day</span></div><p>One burn allocation per dividend epoch, tallied in fUSD and in $FOLIO at market. Live ledger on the Dividends tab.</p></div>
</div>
<div class="card" style="display:grid;grid-template-columns:1fr 1fr;gap:30px">
 <div><span class="caps" style="font-size:11px">Two-sided pressure on one token</span><h3>Demand up. Supply down. Same fee.</h3><p>The same fee that funds a stock airdrop <i>to</i> holders now also removes $FOLIO from circulation. Holders get paid in NVDA and the float shrinks — from the same 15-minute epoch.</p></div>
 <div><span class="caps" style="font-size:11px">Sources of the burn</span><p style="font-family:'JetBrains Mono';font-size:15px;line-height:1.9;margin-top:6px">• 30% of every 15-min revenue epoch<br>• 10% of principal on early lock exits<br>• sfUSD exit fees (one day of APR)<br>• No team allocation, no unlock schedule</p></div>
</div>`, 'Buyback allocations are executed from the treasury at market. Nothing here is financial advice.');

(async () => {
  for (const [n, h] of [['folio-tech-flywheel', fly], ['folio-tech-boost', boost], ['folio-tech-burn', burn]]) {
    const f = path.join(__dirname, 'out', n + '.html'); fs.writeFileSync(f, h); await shot(f, path.join(__dirname, '..', 'brand', n + '.png'), 1600, 900);
  }
})().catch(e => { console.error(e); process.exit(1); });
