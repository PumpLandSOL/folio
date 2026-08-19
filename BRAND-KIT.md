# FOLIO — Brand Kit

**A folio of stocks. A dollar that pays you back.** fUSD stock-collateral stablecoin + sfUSD + stability pool + 15-minute stock dividends + perps, on BNB Chain.

- Site: https://foliobnb.xyz · X: @FolioBNB (placeholder — site `/x` redirects) · Ticker: **$FOLIO**

## Assets (`brand/`)
| File | Size | Use |
|---|---|---|
| folio-pfp.png | 2000×2000 | X / Telegram avatar (twin zodiac seals + wordmark, circle-safe) |
| folio-banner.png | 3000×1000 | X header |
| folio-og.png | 2400×1260 | Link preview |
| folio-wordmark.png | 2400×800 | Logo lockup |
| folio-ledger.png | 2400×1350 | "One dollar. Five lines." explainer (hold/stake/backstop/dividend/trade) |
| folio-markets.png | 2400×1350 | Collateral tiers (Stables 90 · BNB 75 · T1 55 · T2 40) |
| folio-perps.png | 2400×1350 | Dark perps key-art ("Trade the folio. Fund the dividend.") |
| **folio-hype.mp4** | 1280×720 · 10s | Hype cut — seals → mint → 15-min dividend → stake/backstop/trade → endcard |
| **folio-demo-mint.mp4** | 1280×720 · 15s | Tech demo 1 — real app: pick NVDA vault → deposit 5 → mint 500 fUSD → stake → sfUSD |
| **folio-demo-perps.mp4** | 1280×720 · 15s | Tech demo 2 — real app: HOOD 10× long on fUSD margin → fee lands in revenue pot → dividend engine |

Regenerate (needs headless Chrome + ffmpeg, server on :8188 for demos):
`node _studio/brand.cjs` · `node _studio/hype.cjs` · `node _studio/demo.cjs mint` · `node _studio/demo.cjs perps`

## Identity
- **Mark**: fine line-art monkey + horse zodiac seals (dashed outer ring), overlapping as a twin lockup.
- **Palette**: paper `#f8f6f2` · card `#fffdf9` · ink `#1c1b18` · ink2 `#5a5852` · muted `#8f8b82` · rule `#e6e1d8` · gold `#b8933d` · gold-dark `#8f6f25` · gold-light `#e6d5ab` · green `#2f6b4a` · red `#a83b2b`. Dark surface (perps terminal): `#1c1b18` + `#e6d5ab`.
- **Type**: Newsreader 300 (thin serif display, italic gold emphasis) · Hanken Grotesk 700 small-caps (0.18em tracking, labels) · JetBrains Mono (numbers, tape).
- **Texture**: paper grain overlay, gold hairline dividers, ruled tables, seal watermarks.

## Voice
Brokerage-statement calm. Short declaratives. Never "demo", "beta", "simulated", "guaranteed".

Taglines: "A folio of stocks. A dollar that pays you back." · "Your stocks, working." · "Fees in. Stock out." · "Trade the folio. Fund the dividend." · "One dollar. Five lines."

## X bio
> A folio of stocks. A dollar that pays you back. Mint fUSD against tokenized equities & BNB — every 15 min protocol fees buy stock for $FOLIO holders. BNB Chain · foliobnb.xyz

## Tweets

**1 · Intro (attach folio-hype.mp4)**
```
introducing FOLIO

a folio of stocks. a dollar that pays you back.

mint fUSD against NVDA, AAPL, HOOD, SPY, BNB. stake it. every 15 minutes, protocol fees buy stock and airdrop it to $FOLIO holders.

BNB Chain → foliobnb.xyz
```

**2 · Tech demo — mint & stake (attach folio-demo-mint.mp4)**
```
how fUSD works, in 15 seconds:

→ pick a vault (isolated, tiered LTV, Pyth oracle)
→ lock 5 NVDA at 55% LTV
→ mint 500 fUSD · 3% APR, 0.10% origination
→ stake → sfUSD, 6% target from borrower fees

every fee you just paid goes to the dividend engine. foliobnb.xyz
```

**3 · Tech demo — perps → dividend (attach folio-demo-perps.mp4)**
```
the loop that makes $FOLIO different:

→ open a HOOD 10× long on fUSD margin (0.06% fee)
→ that fee lands in the revenue pot
→ every 15 min: 50% buys stock at oracle → airdropped to holders, 50% → locked LP

fees in. stock out. foliobnb.xyz
```

**4 · Ledger (attach folio-ledger.png)**
```
one dollar. five lines.

01 hold — fUSD, redeemable 1:1 via PSM
02 stake — sfUSD, 6% target
03 backstop — stability pool, 5% liq. discount
04 dividend — stock airdrop every 15 min
05 trade — perps, 25× crypto / 10× stocks

$FOLIO · BNB Chain
```

**5 · Markets (attach folio-markets.png)**
```
tiered like a prime broker.

USDT 90% · BNB 75% · NVDA AAPL GOOGL SPY 55% · HOOD META TSLA 40%

isolated vaults. liquidation at health < 1.0 — the stability pool burns the debt and takes collateral 5% under oracle. foliobnb.xyz/docs
```
