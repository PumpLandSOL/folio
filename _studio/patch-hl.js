const fs=require('fs'),path=require('path');const C=path.join(__dirname,'..','client');
let s=fs.readFileSync(path.join(C,'index.html'),'utf8');
s=s.replace('<link rel="stylesheet" href="/folio.css">','<link rel="stylesheet" href="/folio.css"><link rel="stylesheet" href="/hl.css">');
const HL=`
 <div class="sec" id="trade"><h2>Trade the same book</h2><p class="sub">Perpetuals on the stocks that back fUSD — margined in fUSD, marked to Pyth, funded hourly. Every fee pays the dividend.</p>
  <div class="hl">
   <div class="hlhead"><span><span class="dot"></span><b>FOLIO PERPS</b> · isolated margin · fUSD</span><span id="hlOI">open interest —</span></div>
   <div class="strip" id="hlStrip"></div>
   <div class="grid2">
    <div style="overflow:auto"><table><thead><tr><th>Market</th><th class="num">Mark</th><th class="num">Δ</th><th>Chart</th><th class="num">Funding/h</th><th class="num">Long OI</th><th class="num">Short OI</th><th class="num">Max lev</th></tr></thead><tbody id="hlRows"></tbody></table></div>
    <div class="ticket"><div class="ls"><div class="on">Long</div><div>Short</div></div>
     <div class="lab">Market</div><div class="box"><b id="tkSym">NVDA</b><span id="tkPx">—</span></div>
     <div class="lab">Margin</div><div class="box">100.00<span>fUSD</span></div>
     <div class="lab">Leverage · 10×</div><div class="lev"><i></i><b></b></div>
     <div class="kv"><span>Notional</span><b>1,000.00 fUSD</b></div><div class="kv"><span>Est. liq. price</span><b id="tkLiq">—</b></div><div class="kv"><span>Fee</span><b>0.06%</b></div><div class="kv"><span>Maintenance</span><b>0.5%</b></div>
     <a class="go" href="/app">Open a position →</a></div>
   </div>
  </div></div>
`;
if(!s.includes('id="trade"')){
 s=s.replace('<div class="sec"><h2>Compared to other stable dollars</h2>',HL+'\n <div class="sec"><h2>Compared to other stable dollars</h2>');
 s=s.replace('<a href="/#stats">Stats</a>','<a href="/#stats">Stats</a><a href="/#trade">Trade</a>');
 const JS=` const H=window.__hist=window.__hist||{};S.perps.forEach(p=>{(H[p.sym]=H[p.sym]||[]).push(p.px);if(H[p.sym].length>40)H[p.sym].shift()});
 const spark=a=>{if(!a||a.length<2)return'';const mn=Math.min(...a),mx=Math.max(...a),r=mx-mn||1;const pts=a.map((v,i)=>(i/(a.length-1)*80)+','+(20-(v-mn)/r*16-2)).join(' ');const c=a[a.length-1]>=a[0]?'#50d2c1':'#ef5350';return '<svg class="spark" viewBox="0 0 80 22" style="color:'+c+'"><polyline points="'+pts+'" fill="none" stroke="'+c+'" stroke-width="1.5"/></svg>'};
 $('hlRows').innerHTML=S.perps.map(p=>{const a=H[p.sym],ch=a.length>1?(a[a.length-1]/a[0]-1)*100:0;return '<tr><td><b>'+p.sym+'</b>-PERP</td><td class="num">'+fpx(p.px)+'</td><td class="num '+(ch>=0?'up':'dn')+'">'+(ch>=0?'+':'')+ch.toFixed(3)+'%</td><td>'+spark(a)+'</td><td class="num '+(p.funding.rate>=0?'dn':'up')+'">'+(p.funding.rate*100).toFixed(4)+'%</td><td class="num">'+fmt(p.funding.longOI||0,0)+'</td><td class="num">'+fmt(p.funding.shortOI||0,0)+'</td><td class="num">'+p.maxLev+'×</td></tr>'}).join('');
 $('hlOI').textContent='open interest $'+fmt(S.perpOI,0)+' · '+S.perps.length+' markets';
 $('hlStrip').innerHTML=S.perps.slice(0,8).map(p=>'<span><b>'+p.sym+'</b> '+fpx(p.px)+'</span>').join('');
 const nv=S.perps.find(p=>p.sym==='NVDA');if(nv){$('tkPx').textContent=fpx(nv.px);$('tkLiq').textContent=fpx(nv.px*(1-1/10+0.005))}
`;
 s=s.replace(" if(S.folio.price)$('pxFolio')",JS+" if(S.folio.price)$('pxFolio')");
}
fs.writeFileSync(path.join(C,'index.html'),s);
let a=fs.readFileSync(path.join(C,'app.html'),'utf8');
a=a.replace('<link rel="stylesheet" href="/folio.css">','<link rel="stylesheet" href="/folio.css"><link rel="stylesheet" href="/hl.css">');
a=a.replace('return `<div class="two"><div><span class="kicker">Perpetuals · fUSD margin · pyth mark · hourly funding</span>','return `<div class="two"><div class="perpsdark"><span class="kicker">Perpetuals · fUSD margin · pyth mark · hourly funding</span>');
a=a.replace('</div><aside><div class="panel"><span class="kicker">${sel} · max ${mk.maxLev}× · fee 0.06%</span>','</div><aside><div class="panel hlp"><span class="kicker">${sel} · max ${mk.maxLev}× · fee 0.06%</span>');
a=a.replace("const rows=S.perps.map(p=>`<tr onclick=\"F.pSym='${p.sym}';render()\" style=\"cursor:pointer;${sel===p.sym?'background:rgba(107,155,122,.14)':''}\">","const rows=S.perps.map(p=>`<tr onclick=\"F.pSym='${p.sym}';render()\" style=\"cursor:pointer;${sel===p.sym?'background:rgba(80,210,193,.12)':''}\">");
a=a.replace("style=\"width:100%;background:${side==='long'?'var(--sage2)':'var(--red)'};border-color:${side==='long'?'var(--sage2)':'var(--red)'}\"","style=\"width:100%;background:${side==='long'?'#50d2c1':'#ef5350'};border-color:${side==='long'?'#50d2c1':'#ef5350'};color:${side==='long'?'#062a26':'#fff'}\"");
fs.writeFileSync(path.join(C,'app.html'),a);
console.log('ok',s.includes('id="trade"'),a.includes('perpsdark'),a.includes('#50d2c1'));
