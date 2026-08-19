// Caption / title / cursor overlay injected into the real FOLIO app for demo recordings.
module.exports = String.raw`
(() => {
  const s = document.createElement('style');
  s.textContent = ` + '`' + `
    #dmTitle{position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f8f6f2;opacity:0;transition:opacity .45s;text-align:center}
    #dmTitle.on{opacity:1}
    #dmTitle .t{font-family:'Newsreader',Georgia,serif;font-weight:300;font-size:74px;letter-spacing:-.02em;line-height:1.05;color:#1c1b18;max-width:1000px}
    #dmTitle .t em{font-style:italic;color:#8f6f25}
    #dmTitle .s{font-family:'Hanken Grotesk',system-ui,sans-serif;font-weight:700;font-size:14px;letter-spacing:.24em;color:#8f6f25;margin-top:26px;text-transform:uppercase}
    #dmTitle .ln{width:120px;height:1px;background:#b8933d;margin-top:30px}
    #dmCap{position:fixed;left:32px;bottom:32px;transform:translateY(24px);z-index:99998;max-width:640px;background:rgba(255,253,249,.96);border:1px solid #e6e1d8;border-left:3px solid #b8933d;padding:16px 24px;opacity:0;transition:opacity .3s,transform .3s;box-shadow:0 18px 50px rgba(28,27,24,.14)}
    #dmCap.on{opacity:1;transform:translateY(0)}
    #dmCap .k{font-family:'Hanken Grotesk',system-ui,sans-serif;font-weight:700;font-size:10.5px;letter-spacing:.2em;color:#8f6f25;text-transform:uppercase}
    #dmCap .v{font-family:'Newsreader',Georgia,serif;font-weight:300;font-size:25px;color:#1c1b18;margin-top:6px;line-height:1.3}
    #dmCap .v b{font-weight:400;color:#8f6f25;font-style:italic}
    #dmCur{position:fixed;z-index:99999;width:22px;height:22px;left:0;top:0;pointer-events:none;transition:left .55s cubic-bezier(.5,0,.2,1),top .55s cubic-bezier(.5,0,.2,1);opacity:0}
    #dmRing{position:fixed;z-index:99999;width:56px;height:56px;border:2px solid #b8933d;border-radius:50%;pointer-events:none;opacity:0;transform:translate(-50%,-50%) scale(.3)}
    #dmRing.go{animation:dmr .5s ease-out}
    @keyframes dmr{0%{opacity:.9;transform:translate(-50%,-50%) scale(.3)}100%{opacity:0;transform:translate(-50%,-50%) scale(1.5)}}
  ` + '`' + `;
  document.head.appendChild(s);
  const title = document.createElement('div'); title.id='dmTitle'; title.innerHTML='<div class="t"></div><div class="ln"></div><div class="s"></div>'; document.body.appendChild(title);
  const cap = document.createElement('div'); cap.id='dmCap'; cap.innerHTML='<div class="k"></div><div class="v"></div>'; document.body.appendChild(cap);
  const cur = document.createElement('div'); cur.id='dmCur';
  cur.innerHTML='<svg width="22" height="22" viewBox="0 0 22 22"><path d="M2 2 L2 17 L6 13 L9 20 L12 19 L9 12 L15 12 Z" fill="#1c1b18" stroke="#f8f6f2" stroke-width="1.2"/></svg>';
  document.body.appendChild(cur);
  const ring = document.createElement('div'); ring.id='dmRing'; document.body.appendChild(ring);
  window.__title = (t, sub) => { title.querySelector('.t').innerHTML=t; title.querySelector('.s').textContent=sub||''; title.classList.add('on'); };
  window.__titleHide = () => title.classList.remove('on');
  window.__cap = (k, v) => { cap.querySelector('.k').textContent=k||''; cap.querySelector('.v').innerHTML=v||''; cap.classList.add('on'); };
  window.__capHide = () => cap.classList.remove('on');
  window.__q = (sel) => { if (typeof sel === 'string' && sel.startsWith('text:')) { const t=sel.slice(5).toLowerCase(); return [...document.querySelectorAll('button,tr,a')].find(e=>e.textContent.trim().toLowerCase().startsWith(t))||null; } return document.querySelector(sel); };
  window.__center = (sel) => { const el=window.__q(sel); if(!el) return null; const r=el.getBoundingClientRect(); return {x:Math.round(r.left+r.width/2), y:Math.round(r.top+r.height/2)}; };
  window.__cursorTo = (sel) => { const c=window.__center(sel); if(!c) return false; cur.style.opacity='1'; cur.style.left=c.x+'px'; cur.style.top=c.y+'px'; return true; };
  window.__click = (sel) => { const c=window.__center(sel); if(!c) return false; ring.style.left=c.x+'px'; ring.style.top=c.y+'px'; ring.classList.remove('go'); void ring.offsetWidth; ring.classList.add('go'); window.__q(sel).click(); return true; };
  window.__type = async (id, text, ms) => { const i=document.getElementById(id); if(!i) return false; i.focus({preventScroll:true}); i.value=''; for (const ch of text) { i.value+=ch; i.dispatchEvent(new Event('input',{bubbles:true})); await new Promise(r=>setTimeout(r,ms||70)); } return true; };
  return true;
})()`;
