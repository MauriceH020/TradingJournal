---
name: Crypto quantity units
description: The quantity convention used for Binance USDT perpetuals in this journal.
---

# Crypto quantity units

BTCUSDT executions are entered in BTC and ETHUSDT executions in ETH. P&L and R calculations therefore use a multiplier of `1` for those instruments, rather than a per-contract fraction.

**Why:** A real trade entered as 0.12 BTC must realize price movement across 0.12 BTC; treating it as 0.12 contracts with a 0.001 multiplier reduces its P&L by 1,000×.

**How to apply:** Keep crypto instrument labels, create-trade execution defaults, seed data, and the contract multiplier aligned with the base asset quantity convention. Do not reintroduce fractional contract multipliers unless the UI explicitly records quantities in those contract units.