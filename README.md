# Folio — foliobnb.xyz

A folio of stocks, a dollar that pays. fUSD stock-collateral stablecoin + sfUSD + stability pool + 15-minute stock dividends + perps, on BNB Chain.

Dependency-free Node ≥18. `node server/index.js` (port 8188). Env: `PORT`, `DATA_PATH` (persist data.json), `FOLIO_MINT` (BSC token address → live price + on-chain holder reads).

## V2 — The Compounding Update (2026-08-18)
- **Holder boost**: real on-chain $FOLIO balance → tier (Bronze 0.01% / Silver 0.1% / Gold 0.5% / Diamond 1% of supply) → 1.5×/2×/2.5×/3× on sfUSD APY (6% → 18%), term-lock APY and Season points.
- **Term locks**: fUSD 30/90/180/365d at 12/20/30/50% base APY × tier; early exit burns 10% of principal.
- **Season 1 points** (ends 2026-11-01): 5% of supply airdrop pool; continuous points on staked/locked/pooled/borrowed dollars, trades, dividends, check-in streaks (+50% max), referrals 10% forever (`/app?ref=0x…`).
- **Buyback & burn**: dividend split now 40% stock / 30% LP / 30% $FOLIO buyback & burn; penalties burned too.
- New endpoints: `POST /api/lock` `{amount,days}`, `/api/unlock` `{id}`, `/api/checkin`, `/api/ref` `{ref}`, `GET /api/season?w=`.
