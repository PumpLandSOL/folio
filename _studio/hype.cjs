// FOLIO 10s hype cut → brand/folio-hype.mp4.  node _studio/hype.cjs
const fs = require('fs'), path = require('path');
const { record } = require('./rec.cjs');
const html = fs.readFileSync(path.join(__dirname, 'out', 'folio-banner.html'), 'utf8'); // reuse fonts+base css
const head = html.slice(0, html.indexOf('</style>'));
const MONKEY = html.match(/<svg class="seal"[^>]*>(.*?)<\/svg>/s)[1];
const HORSE = html.match(/<svg class="seal"[^>]*>.*?<\/svg>.*?<svg class="seal"[^>]*>(.*?)<\/svg>/s)[1];
const page = `${head}
.stage{width:1280px;height:720px}
.sc{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;opacity:0;transition:opacity .4s}
.sc.on{opacity:1}
.big{font-size:84px;max-width:1000px}
.k{font-size:13px;margin-top:22px}
.ln{width:110px;height:1px;background:var(--gold);margin-top:26px}
.seals{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:1300px;height:900px;opacity:.10;pointer-events:none}
.seals svg{position:absolute;stroke:var(--gold);fill:none;stroke-width:.5;stroke-linecap:round;stroke-linejoin:round;color:var(--gold)}
.row{display:flex;gap:26px;margin-top:38px}
.st{border:1px solid var(--rule);background:var(--card);padding:26px 34px;min-width:200px}
.st b{display:block;font-family:'Newsreader',serif;font-weight:300;font-size:58px;letter-spacing:-.02em}
.st span{display:block;font-size:11px;margin-top:6px}
.tick{position:absolute;left:0;right:0;top:0;height:34px;background:#1c1b18;color:#e6d5ab;font-family:'JetBrains Mono';font-size:12px;display:flex;align-items:center;gap:34px;padding:0 20px;white-space:nowrap;overflow:hidden}
.tick b{color:#f8f6f2;font-weight:500}.tick span{margin-right:34px}
.tick i{display:inline-block;animation:mv 18s linear infinite;font-style:normal}
@keyframes mv{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.mark{display:flex;justify-content:center;position:relative;width:340px;height:220px;margin-bottom:26px}
.mark svg{position:absolute;top:0;width:220px;height:220px;stroke:var(--gold);fill:none;stroke-width:1.1;stroke-linecap:round;stroke-linejoin:round;color:var(--gold)}
.pulse{animation:pl 1.6s ease-in-out infinite alternate}@keyframes pl{from{opacity:.55}to{opacity:1}}
</style></head><body><div class="stage">
<div class="tick"><i>${'<span><b>NVDA</b> $210.94</span><span><b>AAPL</b> $305.63</span><span><b>HOOD</b> $97.72</span><span><b>SPY</b> $753.89</span><span><b>BNB</b> $603.31</span><span><b>fUSD</b> $1.000</span><span><b>next dividend</b> 09:41</span>'.repeat(4)}</i></div>
<div class="seals"><svg viewBox="0 0 64 64" style="left:-40px;top:60px;width:700px;height:700px">${MONKEY}</svg><svg viewBox="0 0 64 64" style="right:-40px;top:120px;width:700px;height:700px">${HORSE}</svg></div>
<div class="sc" id="s1"><div class="mark"><svg viewBox="0 0 64 64" style="left:0">${MONKEY}</svg><svg viewBox="0 0 64 64" style="right:0">${HORSE}</svg></div><div class="serif big">Folio</div><div class="caps k">a folio of stocks · a dollar that pays</div></div>
<div class="sc" id="s2"><div class="serif big">Mint a dollar against<br><em>your stocks.</em></div><div class="ln"></div><div class="caps k">fUSD · NVDA AAPL GOOGL HOOD SPY · BNB · USDT</div></div>
<div class="sc" id="s3"><div class="serif big">Every 15 minutes,<br>fees buy stock and <em>pay you.</em></div><div class="row"><div class="st"><b>50%</b><span class="caps">stock airdrop</span></div><div class="st"><b>50%</b><span class="caps">locked LP</span></div><div class="st"><b>15 min</b><span class="caps">every epoch</span></div></div></div>
<div class="sc" id="s4"><div class="serif big">Stake it. Backstop it.<br><em>Trade it</em> at 25×.</div><div class="caps k">sfUSD 6% · stability pool · perps on stocks & crypto</div></div>
<div class="sc" id="s5"><div class="serif big">Your stocks, <em>working.</em></div><div class="ln"></div><div class="caps k pulse">foliobnb.xyz · $FOLIO · BNB Chain</div></div>
</div></body></html>`;
const f = path.join(__dirname, 'out', 'folio-hype.html'); fs.writeFileSync(f, page);
record({ url: 'file:///' + f.replace(/\\/g, '/'), out: path.join(__dirname, '..', 'brand', 'folio-hype.mp4'), warm: 1200, async run({ ev, sleep }) {
  const show = async (id, ms) => { await ev(`document.querySelectorAll('.sc').forEach(e=>e.classList.remove('on'));document.getElementById('${id}').classList.add('on')`); await sleep(ms); };
  await show('s1', 1900); await show('s2', 1900); await show('s3', 2200); await show('s4', 1900); await show('s5', 2000);
} }).catch((e) => { console.error(e); process.exit(1); });
