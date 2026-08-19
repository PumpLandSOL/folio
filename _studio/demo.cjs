// FOLIO tech demos (15s each) against the running local app.
//   node _studio/demo.cjs mint     → brand/folio-demo-mint.mp4   (mint fUSD → stake → sfUSD)
//   node _studio/demo.cjs perps    → brand/folio-demo-perps.mp4  (open a perp → fees → 15-min dividend)
const path = require('path');
const { record } = require('./rec.cjs');
const OVERLAY = require('./overlay.cjs');
const which = process.argv[2] || 'mint';
const SITE = process.env.SITE || 'http://localhost:8188';
const W = { mint: '0xf0110a11ce0000000000000000000000000000a1', perps: '0xf0110b0b0000000000000000000000000000b2b2' }[which].slice(0,-1) + Math.floor(Math.random() * 9);

const scripts = {
  async mint({ ev, sleep }) {
    await ev(`localStorage.setItem('folio_w','${W}');localStorage.setItem('folio_tab','mint');location.reload()`); await sleep(1300);
    await ev(OVERLAY, true); await ev("document.body.style.zoom=0.82;window.scrollTo(0,0)");
    await ev("window.__title('Mint a dollar against <em>your stocks.</em>','fUSD · stock-collateral CDP · BNB Chain')"); await sleep(1200);
    await ev("window.__titleHide()"); await sleep(300);
    await ev("window.__cap('01 · collateral markets','Isolated vaults, tiered LTV. Equities, BNB, USDT. <b>Pyth oracle.</b>')"); await sleep(1200);
    await ev("window.__cursorTo('text:nvda')"); await sleep(600);
    await ev("window.__click('text:nvda')"); await sleep(700);
    await ev("window.__cap('02 · deposit','Lock 5 NVDA into the vault. Tier 1 · <b>55% LTV.</b>')");
    await ev("window.__type('dAmt','5',90)", true); await sleep(500);
    await ev("document.activeElement.blur();window.scrollTo(0,0);window.__cursorTo('#view aside .btn')"); await sleep(500);
    await ev("window.__click('#view aside .btn')"); await sleep(1300);
    await ev("window.__cap('03 · mint fUSD','Borrow 500 fUSD. <b>3.00% APR</b>, 0.10% origination — fees feed the dividend.')");
    await ev("window.__type('mAmt','500',90)", true); await sleep(400);
    await ev("document.activeElement.blur();window.scrollTo(0,0);window.__cursorTo('#view aside .btn.acc')"); await sleep(500);
    await ev("window.__click('#view aside .btn.acc')"); await sleep(1500);
    await ev("window.__cap('04 · stake','fUSD → sfUSD. Accretes stability fees. <b>6% target.</b>')");
    await ev("window.__cursorTo('#tabs button:nth-child(2)')"); await sleep(500);
    await ev("window.__click('#tabs button:nth-child(2)')"); await sleep(700);
    await ev("window.__type('stAmt','400',80)", true); await sleep(300);
    await ev("document.activeElement.blur();window.scrollTo(0,0);window.__cursorTo('#view .btn.acc')"); await sleep(450);
    await ev("window.__click('#view .btn.acc')"); await sleep(1500);
    await ev("window.__capHide()"); await sleep(200);
    await ev("window.__title('Hold. Stake. <em>Get paid.</em>','foliobnb.xyz · $FOLIO')"); await sleep(1400);
  },
  async perps({ ev, sleep }) {
    await ev(`localStorage.setItem('folio_w','${W}');localStorage.setItem('folio_tab','perps');location.reload()`); await sleep(1300);
    await ev(OVERLAY, true); await ev("document.body.style.zoom=0.82;window.scrollTo(0,0)");
    // seed: some fUSD via PSM so margin exists
    await ev(`fetch('/api/psm',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({wallet:'${W}',dir:'in',amount:1500})}).then(()=>load())`, false); await sleep(400);
    await ev("window.__title('Trade the folio.<br><em>Fund the dividend.</em>','perps · fUSD margin · pyth mark')"); await sleep(1200);
    await ev("window.__titleHide()"); await sleep(300);
    await ev("window.__cap('01 · perp markets','Stocks 10×, crypto 25×. Hourly funding. <b>0.06% fee.</b>')"); await sleep(1100);
    await ev("window.__cursorTo('text:hood')"); await sleep(600);
    await ev("window.__click('text:hood')"); await sleep(700);
    await ev("window.__cap('02 · size it','500 fUSD margin · 10× · isolated. Liq. price shown <b>before you click.</b>')");
    await ev("window.__type('pMargin','500',90)", true); await sleep(300);
    await ev("document.activeElement.blur();F.pLev='10';render();window.__cursorTo('.seg button')"); await sleep(600);
    await ev("window.__click('.seg button')"); await sleep(600);
    await ev("window.__cursorTo('text:buy / long')"); await sleep(500);
    await ev("window.__click('text:buy / long')"); await sleep(1500);
    await ev("window.__cap('03 · open','Position live at Pyth mark. The 0.06% fee just landed in the <b>revenue pot.</b>')"); await sleep(1600);
    await ev("window.__cap('04 · every 15 minutes','Revenue → 50% buys stock at oracle, airdropped to $FOLIO holders. <b>50% locked LP.</b>')");
    await ev("window.__cursorTo('#tabs button:nth-child(3)')"); await sleep(500);
    await ev("window.__click('#tabs button:nth-child(3)')"); await sleep(2200);
    await ev("window.__capHide()"); await sleep(200);
    await ev("window.__title('Fees in. <em>Stock out.</em>','foliobnb.xyz · $FOLIO')"); await sleep(1400);
  },
};

record({ url: SITE + '/app', out: path.join(__dirname, '..', 'brand', `folio-demo-${which}.mp4`), run: scripts[which] })
  .catch((e) => { console.error(e); process.exit(1); });
