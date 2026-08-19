/**
 * Seed script — creates realistic example data for the trading journal.
 * Run with: pnpm --filter @workspace/scripts run seed
 * Safe to re-run: deletes existing seed data first.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import {
  accountsTable,
  instrumentsTable,
  strategiesTable,
  setupsTable,
  confluenceCategoriesTable,
  confluencesTable,
  tagsTable,
  tradesTable,
  executionsTable,
  tradeConfluencesTable,
  tradeTagsTable,
  tradeReviewsTable,
  settingsTable,
} from "../lib/db/src/schema/index.js";
import { eq, inArray } from "drizzle-orm";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function main() {
  console.log("🌱 Seeding trading journal...");

  // ── Settings ────────────────────────────────────────────────────────────────
  await db.delete(settingsTable);
  await db.insert(settingsTable).values({ timezone: "America/New_York", dashboardDefaultDateRange: "this_month" });

  // ── Accounts ────────────────────────────────────────────────────────────────
  await db.delete(accountsTable);
  const [cfdAccount, cryptoAccount] = await db
    .insert(accountsTable)
    .values([
      { name: "CFD Live Account", broker: "ICMarkets", accountType: "Live", baseCurrency: "USD", startingBalance: "10000", currentBalance: "12450", defaultRiskPercentage: "1.0", isActive: true },
      { name: "Crypto Account", broker: "Binance", accountType: "Perpetuals", baseCurrency: "USDT", startingBalance: "5000", currentBalance: "5820", defaultRiskPercentage: "1.5", isActive: true },
    ])
    .returning();

  // ── Instruments ─────────────────────────────────────────────────────────────
  await db.delete(instrumentsTable);
  const [xauusd, nas100, us30, btcusdt, ethusdt] = await db
    .insert(instrumentsTable)
    .values([
      { symbol: "XAUUSD", name: "Gold / US Dollar", assetClass: "Commodity", settlementCurrency: "USD", quantityUnit: "lots", contractMultiplier: "100", isActive: true },
      { symbol: "NAS100", name: "NASDAQ 100 Index", assetClass: "Index", settlementCurrency: "USD", quantityUnit: "lots", contractMultiplier: "1", isActive: true },
      { symbol: "US30", name: "Dow Jones Industrial Average", assetClass: "Index", settlementCurrency: "USD", quantityUnit: "lots", contractMultiplier: "1", isActive: true },
      { symbol: "BTCUSDT", name: "Bitcoin / Tether", assetClass: "Crypto", settlementCurrency: "USDT", quantityUnit: "BTC", contractMultiplier: "1", isActive: true },
      { symbol: "ETHUSDT", name: "Ethereum / Tether", assetClass: "Crypto", settlementCurrency: "USDT", quantityUnit: "ETH", contractMultiplier: "1", isActive: true },
    ])
    .returning();

  // ── Strategies ──────────────────────────────────────────────────────────────
  await db.delete(strategiesTable);
  const [orb, llr, bo, tc] = await db
    .insert(strategiesTable)
    .values([
      { name: "ORB", description: "Opening Range Breakout — trades the first 15-min candle range break", isActive: true },
      { name: "Large Level Reversal", description: "Reversal off major S/R levels with confluence", isActive: true },
      { name: "Breakout", description: "Price action breakout of consolidation zones", isActive: true },
      { name: "Trend Continuation", description: "Pullback entry in direction of higher timeframe trend", isActive: true },
    ])
    .returning();

  // ── Setups ──────────────────────────────────────────────────────────────────
  await db.delete(setupsTable);
  const [orbLong, orbShort, htfLevel, fib618, bmsBreak, emaRibbon] = await db
    .insert(setupsTable)
    .values([
      { strategyId: orb.id, name: "ORB Long", description: "Break above 15-min opening range high", isActive: true },
      { strategyId: orb.id, name: "ORB Short", description: "Break below 15-min opening range low", isActive: true },
      { strategyId: llr.id, name: "HTF Level Bounce", description: "Bounce off daily/weekly support or resistance", isActive: true },
      { strategyId: llr.id, name: "Fib 61.8 Reversal", description: "Reversal at 61.8% Fibonacci retracement", isActive: true },
      { strategyId: bo.id, name: "BMS Break", description: "Break of market structure on lower timeframe", isActive: true },
      { strategyId: tc.id, name: "EMA Ribbon Pullback", description: "Pullback to 20/50 EMA ribbon in trend direction", isActive: true },
    ])
    .returning();

  // ── Confluence Categories & Items ───────────────────────────────────────────
  await db.delete(confluenceCategoriesTable);
  const [levelCat, indicatorCat, structureCat, sessionCat, timeframeCat] = await db
    .insert(confluenceCategoriesTable)
    .values([
      { name: "Level" },
      { name: "Indicator" },
      { name: "Structure" },
      { name: "Session" },
      { name: "Timeframe" },
    ])
    .returning();

  const [dailyLevel, weeklyLevel, psych, prevHigh, prevLow, rsi, macd, ema20, volumeSpike, bos, choch, ote, liqSweep, london, nyOpen, htfBias, ltfEntry] = await db
    .insert(confluencesTable)
    .values([
      { categoryId: levelCat.id, name: "Daily S/R Level", isActive: true },
      { categoryId: levelCat.id, name: "Weekly S/R Level", isActive: true },
      { categoryId: levelCat.id, name: "Psychological Level", isActive: true },
      { categoryId: levelCat.id, name: "Previous Day High", isActive: true },
      { categoryId: levelCat.id, name: "Previous Day Low", isActive: true },
      { categoryId: indicatorCat.id, name: "RSI Divergence", isActive: true },
      { categoryId: indicatorCat.id, name: "MACD Crossover", isActive: true },
      { categoryId: indicatorCat.id, name: "EMA 20/50 Alignment", isActive: true },
      { categoryId: indicatorCat.id, name: "Volume Spike", isActive: true },
      { categoryId: structureCat.id, name: "Break of Structure (BOS)", isActive: true },
      { categoryId: structureCat.id, name: "Change of Character (CHOCH)", isActive: true },
      { categoryId: structureCat.id, name: "Optimal Trade Entry (OTE)", isActive: true },
      { categoryId: structureCat.id, name: "Liquidity Sweep", isActive: true },
      { categoryId: sessionCat.id, name: "London Session", isActive: true },
      { categoryId: sessionCat.id, name: "NY Open Kill Zone", isActive: true },
      { categoryId: timeframeCat.id, name: "HTF Bias Confirmed", isActive: true },
      { categoryId: timeframeCat.id, name: "LTF Entry Signal", isActive: true },
    ])
    .returning();

  // ── Tags ────────────────────────────────────────────────────────────────────
  await db.delete(tagsTable);
  const [fomcTag, highVolTag, nfpTag, overtradeTag, patientTag, emotionalTag, reviewedTag] = await db
    .insert(tagsTable)
    .values([
      { name: "FOMC" },
      { name: "High Volatility" },
      { name: "NFP" },
      { name: "Overtrade" },
      { name: "Patient Entry" },
      { name: "Emotional" },
      { name: "Reviewed" },
    ])
    .returning();

  // ── Trades + Executions ─────────────────────────────────────────────────────
  await db.delete(tradesTable);

  // Helper to create a date n days ago at hour h, minute m
  const dt = (daysAgo: number, h = 10, m = 0) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(h, m, 0, 0);
    return d;
  };

  type TradeSpec = {
    accountId: number;
    instrumentId: number;
    strategyId: number;
    setupId: number;
    direction: "long" | "short";
    timezone?: string;
    entries: Array<{ daysAgo: number; h: number; m: number; price: number; qty: number; commission?: number }>;
    exits: Array<{ daysAgo: number; h: number; m: number; price: number; qty: number; commission?: number }>;
    sl: number;
    tp?: number;
    notes?: string;
    confluenceIds: number[];
    tagIds: number[];
    review?: { ruleAdherence: number; tradeQuality: number; notes: string; well: string; wrong: string };
  };

  const tradeSpecs: TradeSpec[] = [
    // ── CFD / XAUUSD ──
    { accountId: cfdAccount.id, instrumentId: xauusd.id, strategyId: orb.id, setupId: orbLong.id, direction: "long", timezone: "America/New_York",
      entries: [{ daysAgo: 28, h: 9, m: 32, price: 2315.50, qty: 0.5, commission: 3.50 }],
      exits: [{ daysAgo: 28, h: 11, m: 15, price: 2334.20, qty: 0.5, commission: 3.50 }],
      sl: 2308.00, tp: 2340.00, notes: "Clean ORB break on gold, strong volume.",
      confluenceIds: [dailyLevel.id, nyOpen.id, volumeSpike.id, htfBias.id],
      tagIds: [patientTag.id, reviewedTag.id],
      review: { ruleAdherence: 1, tradeQuality: 1, notes: "Textbook ORB. Waited for full candle close above range high.", well: "Waited for confirmation. Proper sizing.", wrong: "Exited slightly early — could have held to TP." } },

    { accountId: cfdAccount.id, instrumentId: xauusd.id, strategyId: llr.id, setupId: htfLevel.id, direction: "short", timezone: "America/New_York",
      entries: [{ daysAgo: 25, h: 14, m: 5, price: 2350.00, qty: 0.3, commission: 2.10 }],
      exits: [{ daysAgo: 25, h: 16, m: 20, price: 2338.70, qty: 0.3, commission: 2.10 }],
      sl: 2356.00, tp: 2335.00, notes: "Weekly resistance rejection. Clean wick.",
      confluenceIds: [weeklyLevel.id, rsi.id, choch.id, ltfEntry.id],
      tagIds: [reviewedTag.id] },

    { accountId: cfdAccount.id, instrumentId: xauusd.id, strategyId: llr.id, setupId: fib618.id, direction: "long", timezone: "America/New_York",
      entries: [{ daysAgo: 22, h: 10, m: 45, price: 2298.40, qty: 0.5, commission: 3.50 }],
      exits: [{ daysAgo: 22, h: 13, m: 30, price: 2288.10, qty: 0.5, commission: 3.50 }],
      sl: 2293.00, tp: 2320.00, notes: "Fib bounce failed — momentum was too bearish.",
      confluenceIds: [dailyLevel.id, ema20.id],
      tagIds: [emotionalTag.id],
      review: { ruleAdherence: 3, tradeQuality: 4, notes: "HTF was bearish — should not have taken this long.", well: "Stopped out correctly, didn't move stop.", wrong: "Traded against HTF trend. Ignored bearish bias." } },

    // ── CFD / NAS100 ──
    { accountId: cfdAccount.id, instrumentId: nas100.id, strategyId: orb.id, setupId: orbShort.id, direction: "short", timezone: "America/New_York",
      entries: [{ daysAgo: 20, h: 9, m: 35, price: 19840.0, qty: 0.2, commission: 4.00 }],
      exits: [{ daysAgo: 20, h: 10, m: 55, price: 19720.0, qty: 0.2, commission: 4.00 }],
      sl: 19900.0, tp: 19680.0, notes: "Pre-market gap down, ORB confirmed short bias.",
      confluenceIds: [nyOpen.id, bos.id, liqSweep.id, htfBias.id, prevHigh.id],
      tagIds: [patientTag.id] },

    { accountId: cfdAccount.id, instrumentId: nas100.id, strategyId: tc.id, setupId: emaRibbon.id, direction: "long", timezone: "America/New_York",
      entries: [{ daysAgo: 18, h: 13, m: 20, price: 19650.0, qty: 0.15, commission: 3.00 }, { daysAgo: 18, h: 14, m: 10, price: 19580.0, qty: 0.1, commission: 2.00 }],
      exits: [{ daysAgo: 17, h: 10, m: 30, price: 19820.0, qty: 0.25, commission: 5.00 }],
      sl: 19520.0, tp: 19900.0, notes: "Added to position at EMA touch. Strong uptrend day.",
      confluenceIds: [ema20.id, htfBias.id, ltfEntry.id, volumeSpike.id],
      tagIds: [patientTag.id, reviewedTag.id] },

    { accountId: cfdAccount.id, instrumentId: nas100.id, strategyId: bo.id, setupId: bmsBreak.id, direction: "long", timezone: "America/New_York",
      entries: [{ daysAgo: 15, h: 10, m: 0, price: 19920.0, qty: 0.2, commission: 4.00 }],
      exits: [{ daysAgo: 15, h: 10, m: 45, price: 19890.0, qty: 0.2, commission: 4.00 }],
      sl: 19880.0, tp: 20050.0, notes: "Stopped out. False breakout — news at 10am reversed move.",
      confluenceIds: [bos.id, nyOpen.id],
      tagIds: [highVolTag.id, fomcTag.id] },

    // ── CFD / US30 ──
    { accountId: cfdAccount.id, instrumentId: us30.id, strategyId: llr.id, setupId: htfLevel.id, direction: "short", timezone: "America/New_York",
      entries: [{ daysAgo: 14, h: 9, m: 50, price: 39450.0, qty: 0.1, commission: 3.00 }],
      exits: [{ daysAgo: 14, h: 12, m: 10, price: 39210.0, qty: 0.1, commission: 3.00 }],
      sl: 39560.0, tp: 39100.0, notes: "Clean rejection at daily resistance. Held full day.",
      confluenceIds: [dailyLevel.id, weeklyLevel.id, rsi.id, liqSweep.id, htfBias.id],
      tagIds: [reviewedTag.id] },

    { accountId: cfdAccount.id, instrumentId: us30.id, strategyId: tc.id, setupId: emaRibbon.id, direction: "long", timezone: "America/New_York",
      entries: [{ daysAgo: 12, h: 14, m: 0, price: 39180.0, qty: 0.1, commission: 3.00 }],
      exits: [{ daysAgo: 12, h: 15, m: 45, price: 39340.0, qty: 0.1, commission: 3.00 }],
      sl: 39080.0, tp: 39400.0, notes: "Afternoon trend continuation. Covered most of target.",
      confluenceIds: [ema20.id, ltfEntry.id, htfBias.id],
      tagIds: [] },

    { accountId: cfdAccount.id, instrumentId: us30.id, strategyId: orb.id, setupId: orbLong.id, direction: "long", timezone: "America/New_York",
      entries: [{ daysAgo: 10, h: 9, m: 33, price: 39620.0, qty: 0.1, commission: 3.00 }],
      exits: [{ daysAgo: 10, h: 10, m: 20, price: 39750.0, qty: 0.1, commission: 3.00 }],
      sl: 39560.0, tp: 39800.0, notes: "ORB long worked fast. Partial exit at 1R.",
      confluenceIds: [nyOpen.id, bos.id, volumeSpike.id],
      tagIds: [patientTag.id] },

    { accountId: cfdAccount.id, instrumentId: xauusd.id, strategyId: orb.id, setupId: orbShort.id, direction: "short", timezone: "America/New_York",
      entries: [{ daysAgo: 8, h: 9, m: 36, price: 2368.00, qty: 0.4, commission: 2.80 }],
      exits: [{ daysAgo: 8, h: 10, m: 5, price: 2371.50, qty: 0.4, commission: 2.80 }],
      sl: 2373.00, tp: 2355.00, notes: "Stopped out quickly. Range held, no conviction.",
      confluenceIds: [nyOpen.id],
      tagIds: [overtradeTag.id],
      review: { ruleAdherence: 4, tradeQuality: 5, notes: "Revenge trade after a stop-out. Should not have entered.", well: "Respected the stop.", wrong: "Entered without proper confluence. Emotional trade." } },

    { accountId: cfdAccount.id, instrumentId: nas100.id, strategyId: llr.id, setupId: htfLevel.id, direction: "long", timezone: "America/New_York",
      entries: [{ daysAgo: 6, h: 11, m: 30, price: 19480.0, qty: 0.2, commission: 4.00 }],
      exits: [{ daysAgo: 6, h: 14, m: 45, price: 19610.0, qty: 0.1, commission: 2.00 }, { daysAgo: 5, h: 10, m: 0, price: 19700.0, qty: 0.1, commission: 2.00 }],
      sl: 19400.0, tp: 19750.0, notes: "Partial exit at 1R, held runner overnight.",
      confluenceIds: [dailyLevel.id, ote.id, htfBias.id, ltfEntry.id],
      tagIds: [patientTag.id, reviewedTag.id] },

    { accountId: cfdAccount.id, instrumentId: us30.id, strategyId: bo.id, setupId: bmsBreak.id, direction: "short", timezone: "America/New_York",
      entries: [{ daysAgo: 4, h: 10, m: 15, price: 39890.0, qty: 0.1, commission: 3.00 }],
      exits: [{ daysAgo: 4, h: 13, m: 30, price: 39720.0, qty: 0.1, commission: 3.00 }],
      sl: 39980.0, tp: 39600.0, notes: "BMS break to downside. News catalyst at 10am helped.",
      confluenceIds: [bos.id, choch.id, liqSweep.id, weeklyLevel.id],
      tagIds: [] },

    // Open trade on CFD
    { accountId: cfdAccount.id, instrumentId: xauusd.id, strategyId: tc.id, setupId: emaRibbon.id, direction: "long", timezone: "America/New_York",
      entries: [{ daysAgo: 1, h: 10, m: 30, price: 2378.50, qty: 0.3, commission: 2.10 }],
      exits: [],
      sl: 2368.00, tp: 2400.00, notes: "EMA ribbon pullback. Holding overnight.",
      confluenceIds: [ema20.id, htfBias.id, dailyLevel.id],
      tagIds: [] },

    // ── CRYPTO / BTCUSDT ──
    { accountId: cryptoAccount.id, instrumentId: btcusdt.id, strategyId: llr.id, setupId: htfLevel.id, direction: "long", timezone: "UTC",
      entries: [{ daysAgo: 26, h: 8, m: 0, price: 68500.0, qty: 0.01, commission: 6.85 }],
      exits: [{ daysAgo: 26, h: 11, m: 30, price: 70100.0, qty: 0.01, commission: 7.01 }],
      sl: 67800.0, tp: 71000.0, notes: "Weekly level bounce. BTC showing strength.",
      confluenceIds: [weeklyLevel.id, volumeSpike.id, htfBias.id, london.id],
      tagIds: [reviewedTag.id] },

    { accountId: cryptoAccount.id, instrumentId: btcusdt.id, strategyId: orb.id, setupId: orbShort.id, direction: "short", timezone: "UTC",
      entries: [{ daysAgo: 24, h: 14, m: 30, price: 71200.0, qty: 0.005, commission: 3.56 }],
      exits: [{ daysAgo: 24, h: 17, m: 0, price: 70400.0, qty: 0.005, commission: 3.52 }],
      sl: 71600.0, tp: 70000.0, notes: "Range compression into resistance, rejected cleanly.",
      confluenceIds: [psych.id, rsi.id, liqSweep.id, ltfEntry.id],
      tagIds: [] },

    { accountId: cryptoAccount.id, instrumentId: btcusdt.id, strategyId: tc.id, setupId: emaRibbon.id, direction: "long", timezone: "UTC",
      entries: [{ daysAgo: 20, h: 6, m: 0, price: 69800.0, qty: 0.008, commission: 5.58 }],
      exits: [{ daysAgo: 20, h: 9, m: 15, price: 69200.0, qty: 0.008, commission: 5.54 }],
      sl: 69400.0, tp: 71000.0, notes: "Stopped out on wick. Pattern was valid.",
      confluenceIds: [ema20.id, htfBias.id],
      tagIds: [highVolTag.id] },

    { accountId: cryptoAccount.id, instrumentId: ethusdt.id, strategyId: llr.id, setupId: fib618.id, direction: "long", timezone: "UTC",
      entries: [{ daysAgo: 19, h: 10, m: 0, price: 3620.0, qty: 0.5, commission: 18.10 }],
      exits: [{ daysAgo: 19, h: 14, m: 30, price: 3690.0, qty: 0.3, commission: 11.07 }, { daysAgo: 18, h: 8, m: 0, price: 3740.0, qty: 0.2, commission: 7.48 }],
      sl: 3580.0, tp: 3780.0, notes: "Fib 61.8 on weekly chart. Scaled out in two parts.",
      confluenceIds: [weeklyLevel.id, ote.id, htfBias.id, ltfEntry.id, london.id],
      tagIds: [patientTag.id, reviewedTag.id] },

    { accountId: cryptoAccount.id, instrumentId: btcusdt.id, strategyId: bo.id, setupId: bmsBreak.id, direction: "long", timezone: "UTC",
      entries: [{ daysAgo: 16, h: 15, m: 0, price: 72500.0, qty: 0.005, commission: 3.63 }],
      exits: [{ daysAgo: 16, h: 18, m: 0, price: 73800.0, qty: 0.005, commission: 3.69 }],
      sl: 72000.0, tp: 74500.0, notes: "ATH breakout continuation. Quick scalp.",
      confluenceIds: [bos.id, volumeSpike.id, htfBias.id],
      tagIds: [] },

    { accountId: cryptoAccount.id, instrumentId: ethusdt.id, strategyId: orb.id, setupId: orbShort.id, direction: "short", timezone: "UTC",
      entries: [{ daysAgo: 13, h: 9, m: 0, price: 3810.0, qty: 0.4, commission: 15.24 }],
      exits: [{ daysAgo: 13, h: 12, m: 30, price: 3750.0, qty: 0.4, commission: 15.00 }],
      sl: 3840.0, tp: 3720.0, notes: "NY session open short on ETH. Clean sweep of highs first.",
      confluenceIds: [psych.id, liqSweep.id, choch.id, nyOpen.id, rsi.id],
      tagIds: [reviewedTag.id] },

    { accountId: cryptoAccount.id, instrumentId: btcusdt.id, strategyId: llr.id, setupId: htfLevel.id, direction: "long", timezone: "UTC",
      entries: [{ daysAgo: 9, h: 7, m: 30, price: 71000.0, qty: 0.007, commission: 4.97 }],
      exits: [{ daysAgo: 9, h: 11, m: 0, price: 70600.0, qty: 0.007, commission: 4.94 }],
      sl: 70500.0, tp: 72500.0, notes: "Stopped out on support breakdown. Level failed.",
      confluenceIds: [dailyLevel.id, ema20.id],
      tagIds: [] },

    { accountId: cryptoAccount.id, instrumentId: ethusdt.id, strategyId: tc.id, setupId: emaRibbon.id, direction: "long", timezone: "UTC",
      entries: [{ daysAgo: 7, h: 12, m: 0, price: 3680.0, qty: 0.3, commission: 11.04 }],
      exits: [{ daysAgo: 7, h: 16, m: 0, price: 3730.0, qty: 0.3, commission: 11.19 }],
      sl: 3640.0, tp: 3800.0, notes: "EMA pullback in strong uptrend. Solid R:R.",
      confluenceIds: [ema20.id, htfBias.id, ltfEntry.id, macd.id],
      tagIds: [patientTag.id] },

    { accountId: cryptoAccount.id, instrumentId: btcusdt.id, strategyId: orb.id, setupId: orbLong.id, direction: "long", timezone: "UTC",
      entries: [{ daysAgo: 3, h: 13, m: 30, price: 73200.0, qty: 0.005, commission: 3.66 }],
      exits: [{ daysAgo: 3, h: 16, m: 15, price: 74100.0, qty: 0.005, commission: 3.71 }],
      sl: 72800.0, tp: 74500.0, notes: "London close momentum. Ran almost to TP.",
      confluenceIds: [bos.id, london.id, volumeSpike.id, htfBias.id],
      tagIds: [reviewedTag.id] },

    // Open crypto trade
    { accountId: cryptoAccount.id, instrumentId: ethusdt.id, strategyId: llr.id, setupId: htfLevel.id, direction: "long", timezone: "UTC",
      entries: [{ daysAgo: 0, h: 8, m: 15, price: 3760.0, qty: 0.2, commission: 7.52 }],
      exits: [],
      sl: 3710.0, tp: 3900.0, notes: "Daily level bounce, holding.",
      confluenceIds: [dailyLevel.id, ote.id, htfBias.id],
      tagIds: [] },
  ];

  for (const spec of tradeSpecs) {
    const [trade] = await db
      .insert(tradesTable)
      .values({
        accountId: spec.accountId,
        instrumentId: spec.instrumentId,
        strategyId: spec.strategyId,
        setupId: spec.setupId,
        direction: spec.direction,
        initialStopLoss: spec.sl.toString(),
        profitTarget: spec.tp?.toString() ?? null,
        plannedEntry: spec.entries[0]?.price.toString() ?? null,
        tradeTimezone: spec.timezone ?? "UTC",
        notes: spec.notes ?? null,
      })
      .returning();

    // Entries
    for (const e of spec.entries) {
      await db.insert(executionsTable).values({
        tradeId: trade.id,
        side: spec.direction === "long" ? "buy" : "sell",
        executedAt: dt(e.daysAgo, e.h, e.m),
        price: e.price.toString(),
        quantity: e.qty.toString(),
        quantityUnit: spec.instrumentId === btcusdt.id ? "BTC" : spec.instrumentId === ethusdt.id ? "ETH" : "lots",
        commission: e.commission?.toString() ?? null,
      });
    }

    // Exits
    for (const e of spec.exits) {
      await db.insert(executionsTable).values({
        tradeId: trade.id,
        side: spec.direction === "long" ? "sell" : "buy",
        executedAt: dt(e.daysAgo, e.h, e.m),
        price: e.price.toString(),
        quantity: e.qty.toString(),
        quantityUnit: spec.instrumentId === btcusdt.id ? "BTC" : spec.instrumentId === ethusdt.id ? "ETH" : "lots",
        commission: e.commission?.toString() ?? null,
      });
    }

    // Confluences
    if (spec.confluenceIds.length > 0) {
      await db.insert(tradeConfluencesTable).values(
        spec.confluenceIds.map((cid) => ({ tradeId: trade.id, confluenceId: cid })),
      );
    }

    // Tags
    if (spec.tagIds.length > 0) {
      await db.insert(tradeTagsTable).values(
        spec.tagIds.map((tid) => ({ tradeId: trade.id, tagId: tid })),
      );
    }

    // Review
    if (spec.review) {
      await db.insert(tradeReviewsTable).values({
        tradeId: trade.id,
        reviewNotes: spec.review.notes,
        whatWentWell: spec.review.well,
        whatWentWrong: spec.review.wrong,
        ruleAdherence: spec.review.ruleAdherence,
        tradeQuality: spec.review.tradeQuality,
      });
    }
  }

  console.log(`✅ Seeded: 2 accounts, 5 instruments, 4 strategies, 6 setups, 5 categories, 17 confluences, 7 tags, ${tradeSpecs.length} trades`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
