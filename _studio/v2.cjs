// FOLIO V2 hype cut → brand/folio-v2.mp4.  node _studio/v2.cjs
const fs = require('fs'), path = require('path');
const { record } = require('./rec.cjs');
const html = fs.readFileSync(path.join(__dirname, 'out', 'folio-banner.html'), 'utf8');
const head = html.slice(0, html.indexOf('</style>'));
const MONKEY = html.match(/<svg class="seal"[^>]*>(.*?)<\/svg>/s)[1];
const HORSE = html.match(/<svg class="seal"[^>]*>.*?<\/svg>.*?<svg class="seal"[^>]*>(.*?)<\/svg>/s)[1];
const page = `${head}
.stage{width:1280px;height:720px}
.sc{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;opacity:0;transition:opacity .4s}
.sc.on{opacity:1}
.big{font-size:84px;max-width:1040px;line-height:1.05}
.k{font-size:13px;margin-top:22px}
.ln{width:110px;height:1px;background:var(--gold);margin-top:26px}
.seals{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:1300px;height:900px;opacity:.10;pointer-events:none}
.seals svg{position:absolute;stroke:var(--gold);fill:none;stroke-width:.5;stroke-linecap:round;stroke-linejoin:round;color:var(--gold)}
.row{display:flex;gap:22px;margin-top:38px}
.st{border:1px solid var(--rule);background:var(--card);padding:24px 30px;min-width:190px}
.st b{display:block;font-family:'Newsreader',serif;font-weight:300;font-size:56px;letter-spacing:-.02em}
.st b.g{color:var(--gold2)}.st b.r{color:#c9563f}
.st span{display:block;font-size:11px;margin-top:6px}
.tick{position:absolute;left:0;right:0;top:0;height:34px;background:#1c1b18;color:#e6d5ab;font-family:'JetBrains Mono';font-size:12px;display:flex;align-items:center;gap:34px;padding:0 20px;white-space:nowrap;overflow:hidden}
.tick b{color:#f8f6f2;font-weight:500}.tick span{margin-right:34px}
.tick i{display:inline-block;animation:mv 18s linear infinite;font-style:normal}
@keyframes mv{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.mark{display:flex;justify-content:center;position:relative;width:340px;height:200px;margin-bottom:22px}
.mark svg{position:absolute;top:0;width:200px;height:200px;stroke:var(--gold);fill:none;stroke-width:1.1;stroke-linecap:round;stroke-linejoin:round;color:var(--gold)}
.pulse{animation:pl 1.6s ease-in-out infinite alternate}@keyframes pl{from{opacity:.55}to{opacity:1}}
.tag{display:inline-block;padding:6px 16px;border:1px solid var(--gold);color:var(--gold2);font-size:12px;letter-spacing:.2em;margin-bottom:26px}
</style></head><body><div class="stage">
<div class="tick"><i>${'<span><b>sfUSD</b> up to 18%</span><span><b>365d lock</b> 50%</span><span><b>burned</b> 30% of revenue</span><span><b>Season 1</b> 5% of supply</span><span><b>NVDA</b> $210.94</span><span><b>fUSD</b> $1.000</span>'.repeat(4)}</i></div>
<div class="seals"><svg viewBox="0 0 64 64" style="left:-40px;top:60px;width:700px;height:700px">${MONKEY}</svg><svg viewBox="0 0 64 64" style="right:-40px;top:120px;width:700px;height:700px">${HORSE}</svg></div>
<div class="sc" id="s1"><div class="mark"><svg viewBox="0 0 64 64" style="left:0">${MONKEY}</svg><svg viewBox="0 0 64 64" style="right:0">${HORSE}</svg></div><div class="caps tag">V2 · THE COMPOUNDING UPDATE</div><div class="serif big">Hold $FOLIO.<br><em>Everything pays more.</em></div></div>
<div class="sc" id="s2"><div class="serif big">sfUSD <em id="apy">6%</em></div><div class="row"><div class="st"><b>1.5×</b><span class="caps">bronze</span></div><div class="st"><b>2×</b><span class="caps">silver</span></div><div class="st"><b>2.5×</b><span class="caps">gold</span></div><div class="st"><b class="g">3×</b><span class="caps">diamond</span></div></div><div class="caps k">holder boost · read live from bnb chain</div></div>
<div class="sc" id="s3"><div class="serif big">Lock fUSD.<br><em>Up to 50%.</em></div><div class="row"><div class="st"><b>12%</b><span class="caps">30 days</span></div><div class="st"><b>20%</b><span class="caps">90 days</span></div><div class="st"><b>30%</b><span class="caps">180 days</span></div><div class="st"><b class="g">50%</b><span class="caps">365 days</span></div></div><div class="caps k">× your tier · early exit burns 10%</div></div>
<div class="sc" id="s4"><div class="serif big">Season 1.<br><em>5% of supply.</em></div><div class="row"><div class="st"><b id="pts">0</b><span class="caps">your points</span></div><div class="st"><b>10%</b><span class="caps">referrals · forever</span></div><div class="st"><b>+50%</b><span class="caps">streak bonus</span></div></div><div class="caps k">every working dollar earns · ends nov 1</div></div>
<div class="sc" id="s5"><div class="serif big">30% of revenue<br><em>burns $FOLIO.</em></div><div class="row"><div class="st"><b>40%</b><span class="caps">stock airdrop</span></div><div class="st"><b>30%</b><span class="caps">locked lp</span></div><div class="st"><b class="r" id="burn">$0.00</b><span class="caps">buyback & burn</span></div></div><div class="caps k">every 15 minutes · forever</div></div>
<div class="sc" id="s6"><div class="serif big">Same dollar.<br><em>Now it compounds.</em></div><div class="ln"></div><div class="caps k pulse">foliobnb.xyz/app · $FOLIO · bnb chain</div></div>
</div></body></html>`;
const f = path.join(__dirname, 'out', 'folio-v2.html'); fs.writeFileSync(f, page);
record({ url: 'file:///' + f.split('\\').join('/'), out: path.join(__dirname, '..', 'brand', 'folio-v2.mp4'), warm: 1200, async run({ ev, sleep }) {
  const show = async (id, ms) => { await ev(`document.querySelectorAll('.sc').forEach(e=>e.classList.remove('on'));document.getElementById('${id}').classList.add('on')`); await sleep(ms); };
  await show('s1',2000);
  await show('s2',0); await ev(`let a=6;const h=setInterval(()=>{a=Math.min(18,a+0.5);document.getElementById('apy').textContent=a.toFixed(0)+'%';if(a>=18)clearInterval(h)},70)`); await sleep(2400);
  await show('s3',2200);
  await show('s4',0); await ev(`let p=0;setInterval(()=>{p+=Math.floor(Math.random()*90+40);document.getElementById('pts').textContent=p.toLocaleString()},50)`); await sleep(2200);
  await show('s5',0); await ev(`let b=0;setInterval(()=>{b+=Math.random()*4.1+1.5;document.getElementById('burn').textContent='$'+b.toFixed(2)},60)`); await sleep(2400);
  await show('s6',2200);
} }).catch((e) => { console.error(e); process.exit(1); });
