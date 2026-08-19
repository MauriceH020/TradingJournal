---
name: API response shapes
description: Actual response shapes for key endpoints in the trading journal API — differs from what the frontend initially assumed
---

# API Response Shapes — Trading Journal

## Trades list (`GET /api/trades`)
Returns `{ trades, total, limit, offset }` — NOT a plain array.
- Access with `(data as any)?.trades || []`
- Each trade has flat fields: `instrumentSymbol`, `settlementCurrency` (NOT `instrument?.symbol`, `account?.baseCurrency`)
- Calculated fields: `calculated.avgEntry`, `calculated.avgExit`, `calculated.openPositionSize`, `calculated.realizedQuantity`, `calculated.realizedNetPnl`, `calculated.actualR`, `calculated.openedAt`

## Dashboard endpoints — all return currency-grouped arrays
- `GET /api/dashboard/equity-curve` → `[{ currency, points: [{ date, cumulativePnl, tradePnl, tradeId }] }]`
- `GET /api/dashboard/pnl-by-day` → `[{ currency, days: [{ dayOfWeek, dayName, netPnl, tradeCount, winRate }] }]`
- `GET /api/dashboard/monthly-pnl` → `[{ currency, months: [{ month, year, netPnl, tradeCount }] }]`
- `GET /api/dashboard/stats` → `[{ currency, netPnl, tradeCount, winRate, ... }]`
- `GET /api/dashboard/recent-trades` → flat array of `{ id, accountName, instrumentSymbol, direction, status, netPnl, outcome, openedAt, closedAt, settlementCurrency }`

**Why:** Charts and stats panels must extract the USD/USDT group from these arrays before passing to Recharts. Use `.find(g => g.currency === 'USD') || groups[0]` pattern.

## FormLabel in shadcn/ui
`FormLabel` uses `useFormField()` internally and MUST be inside a `<FormField>` render prop. For standalone section labels (e.g. in a Tags grid), use a plain `<p className="text-sm font-medium leading-none">` instead.
