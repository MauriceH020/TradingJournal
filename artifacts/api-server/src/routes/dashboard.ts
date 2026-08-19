import { Router } from "express";
import { eq, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  tradesTable,
  executionsTable,
  accountsTable,
  instrumentsTable,
  strategiesTable,
} from "@workspace/db";
import { calcTradeWithDates } from "../lib/calc";

const router = Router();

type TradeSummaryCalc = {
  id: number;
  settlementCurrency: string;
  status: "open" | "partially_closed" | "closed";
  strategyId: number | null;
  strategyName: string | null;
  direction: string;
  openedAt: Date | null;
  closedAt: Date | null;
  netPnl: number;
  grossPnl: number;
  actualR: number | null;
  outcome: "win" | "loss" | "breakeven" | null;
};

async function buildCalcSummaries(accountId?: number, dateFrom?: string, dateTo?: string): Promise<TradeSummaryCalc[]> {
  let rows = await db
    .select({
      trade: tradesTable,
      instrument: instrumentsTable,
      strategy: strategiesTable,
    })
    .from(tradesTable)
    .innerJoin(instrumentsTable, eq(tradesTable.instrumentId, instrumentsTable.id))
    .leftJoin(strategiesTable, eq(tradesTable.strategyId, strategiesTable.id));

  if (accountId) rows = rows.filter((r) => r.trade.accountId === accountId);

  const tradeIds = rows.map((r) => r.trade.id);
  if (!tradeIds.length) return [];

  const allExecs = await db
    .select()
    .from(executionsTable)
    .where(inArray(executionsTable.tradeId, tradeIds))
    .orderBy(executionsTable.executedAt);

  const results: TradeSummaryCalc[] = [];

  for (const row of rows) {
    const t = row.trade;
    const execs = allExecs.filter((e) => e.tradeId === t.id);
    const calc = calcTradeWithDates({
      direction: t.direction as "long" | "short",
      executions: execs.map((e) => ({
        side: e.side as "buy" | "sell",
        price: e.price,
        quantity: e.quantity,
        commission: e.commission,
        fees: e.fees,
      })),
      executionDates: execs.map((e) => ({ side: e.side as "buy" | "sell", executedAt: e.executedAt })),
      initialStopLoss: t.initialStopLoss,
      tradeLevelCostAdjustment: t.tradeLevelCostAdjustment,
      contractMultiplier: row.instrument.contractMultiplier,
    });

    if (!calc.openedAt) continue; // No executions — skip for analytics

    // Date filter
    if (dateFrom && calc.openedAt < new Date(dateFrom)) continue;
    if (dateTo && calc.openedAt > new Date(dateTo + "T23:59:59Z")) continue;

    // Only closed/partially_closed for PnL stats
    const entryQty = execs.filter((e) => e.side === (t.direction === "long" ? "buy" : "sell")).reduce((s, e) => s + Number(e.quantity), 0);
    const exitQty = execs.filter((e) => e.side === (t.direction === "long" ? "sell" : "buy")).reduce((s, e) => s + Number(e.quantity), 0);
    const status: "open" | "partially_closed" | "closed" = entryQty === 0 || exitQty === 0 ? "open" : exitQty >= entryQty ? "closed" : "partially_closed";

    results.push({
      id: t.id,
      settlementCurrency: row.instrument.settlementCurrency,
      status,
      strategyId: t.strategyId ?? null,
      strategyName: row.strategy?.name ?? null,
      direction: t.direction,
      openedAt: calc.openedAt,
      closedAt: calc.closedAt,
      netPnl: calc.realizedNetPnl,
      grossPnl: calc.realizedGrossPnl,
      actualR: calc.actualR,
      outcome: calc.outcome,
    });
  }

  return results;
}

// ── STATS ─────────────────────────────────────────────────────────────────────
router.get("/dashboard/stats", async (req, res) => {
  const { accountId, dateFrom, dateTo } = req.query as Record<string, string>;
  const summaries = await buildCalcSummaries(accountId ? Number(accountId) : undefined, dateFrom, dateTo);
  const closedTrades = summaries.filter((s) => s.status === "closed");

  const byCurrency = groupBy(closedTrades, (s) => s.settlementCurrency);
  const result = Object.entries(byCurrency).map(([currency, trades]) => {
    const wins = trades.filter((t) => t.outcome === "win");
    const losses = trades.filter((t) => t.outcome === "loss");
    const be = trades.filter((t) => t.outcome === "breakeven");
    const netPnl = trades.reduce((s, t) => s + t.netPnl, 0);
    const grossPnl = trades.reduce((s, t) => s + t.grossPnl, 0);
    const avgWinner = wins.length ? wins.reduce((s, t) => s + t.netPnl, 0) / wins.length : 0;
    const avgLoser = losses.length ? losses.reduce((s, t) => s + t.netPnl, 0) / losses.length : 0;
    const rValues = trades.filter((t) => t.actualR !== null).map((t) => t.actualR!);
    const avgR = rValues.length ? rValues.reduce((a, b) => a + b, 0) / rValues.length : null;
    const totalWin = wins.reduce((s, t) => s + t.netPnl, 0);
    const totalLoss = Math.abs(losses.reduce((s, t) => s + t.netPnl, 0));
    const profitFactor = totalLoss > 0 ? totalWin / totalLoss : totalWin > 0 ? null : null;
    const winRate = trades.length ? wins.length / trades.length : 0;
    const expectancy = trades.length
      ? winRate * avgWinner + (1 - winRate) * avgLoser
      : 0;
    return {
      currency,
      tradeCount: trades.length,
      winCount: wins.length,
      lossCount: losses.length,
      breakevenCount: be.length,
      winRate,
      netPnl,
      grossPnl,
      avgWinner,
      avgLoser,
      avgR,
      profitFactor,
      expectancy,
    };
  });

  res.json(result);
});

// ── EQUITY CURVE ──────────────────────────────────────────────────────────────
router.get("/dashboard/equity-curve", async (req, res) => {
  const { accountId, dateFrom, dateTo } = req.query as Record<string, string>;
  const summaries = await buildCalcSummaries(accountId ? Number(accountId) : undefined, dateFrom, dateTo);
  const closed = summaries.filter((s) => s.closedAt && s.status === "closed").sort((a, b) => a.closedAt!.getTime() - b.closedAt!.getTime());

  const byCurrency = groupBy(closed, (s) => s.settlementCurrency);
  const result = Object.entries(byCurrency).map(([currency, trades]) => {
    let running = 0;
    return {
      currency,
      points: trades.map((t) => {
        running += t.netPnl;
        return { date: t.closedAt!, cumulativePnl: running, tradePnl: t.netPnl, tradeId: t.id };
      }),
    };
  });
  res.json(result);
});

// ── P&L BY DAY ────────────────────────────────────────────────────────────────
router.get("/dashboard/pnl-by-day", async (req, res) => {
  const { accountId, dateFrom, dateTo } = req.query as Record<string, string>;
  const summaries = await buildCalcSummaries(accountId ? Number(accountId) : undefined, dateFrom, dateTo);
  const closed = summaries.filter((s) => s.status === "closed" && s.closedAt);

  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const byCurrency = groupBy(closed, (s) => s.settlementCurrency);
  const result = Object.entries(byCurrency).map(([currency, trades]) => {
    const byDay = Array.from({ length: 7 }, (_, i) => ({ dayOfWeek: i, dayName: DAY_NAMES[i], netPnl: 0, tradeCount: 0, wins: 0 }));
    for (const t of trades) {
      const d = t.closedAt!.getDay();
      byDay[d].netPnl += t.netPnl;
      byDay[d].tradeCount++;
      if (t.outcome === "win") byDay[d].wins++;
    }
    return {
      currency,
      days: byDay.map((d) => ({
        dayOfWeek: d.dayOfWeek,
        dayName: d.dayName,
        netPnl: d.netPnl,
        tradeCount: d.tradeCount,
        winRate: d.tradeCount > 0 ? d.wins / d.tradeCount : 0,
      })),
    };
  });
  res.json(result);
});

// ── P&L BY STRATEGY ───────────────────────────────────────────────────────────
router.get("/dashboard/pnl-by-strategy", async (req, res) => {
  const { accountId, dateFrom, dateTo } = req.query as Record<string, string>;
  const summaries = await buildCalcSummaries(accountId ? Number(accountId) : undefined, dateFrom, dateTo);
  const closed = summaries.filter((s) => s.status === "closed");

  type Key = `${string}::${string}`;
  const map = new Map<Key, { strategyId: number | null; strategyName: string; currency: string; trades: TradeSummaryCalc[] }>();

  for (const t of closed) {
    const key: Key = `${t.strategyId ?? "none"}::${t.settlementCurrency}`;
    if (!map.has(key)) {
      map.set(key, { strategyId: t.strategyId, strategyName: t.strategyName ?? "No Strategy", currency: t.settlementCurrency, trades: [] });
    }
    map.get(key)!.trades.push(t);
  }

  const result = Array.from(map.values()).map(({ strategyId, strategyName, currency, trades }) => {
    const wins = trades.filter((t) => t.outcome === "win").length;
    const rVals = trades.filter((t) => t.actualR !== null).map((t) => t.actualR!);
    return {
      strategyId,
      strategyName,
      currency,
      tradeCount: trades.length,
      winRate: trades.length ? wins / trades.length : 0,
      netPnl: trades.reduce((s, t) => s + t.netPnl, 0),
      avgR: rVals.length ? rVals.reduce((a, b) => a + b, 0) / rVals.length : null,
    };
  });
  res.json(result);
});

// ── MONTHLY P&L ───────────────────────────────────────────────────────────────
router.get("/dashboard/monthly-pnl", async (req, res) => {
  const { accountId, year } = req.query as Record<string, string>;
  const summaries = await buildCalcSummaries(accountId ? Number(accountId) : undefined);
  let closed = summaries.filter((s) => s.status === "closed" && s.closedAt);
  if (year) closed = closed.filter((s) => s.closedAt!.getFullYear() === Number(year));

  const byCurrency = groupBy(closed, (s) => s.settlementCurrency);
  const result = Object.entries(byCurrency).map(([currency, trades]) => {
    const byYearMonth = new Map<string, { month: number; year: number; netPnl: number; tradeCount: number }>();
    for (const t of trades) {
      const m = t.closedAt!.getMonth() + 1;
      const y = t.closedAt!.getFullYear();
      const key = `${y}-${m}`;
      if (!byYearMonth.has(key)) byYearMonth.set(key, { month: m, year: y, netPnl: 0, tradeCount: 0 });
      const entry = byYearMonth.get(key)!;
      entry.netPnl += t.netPnl;
      entry.tradeCount++;
    }
    return {
      currency,
      months: Array.from(byYearMonth.values()).sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month),
    };
  });
  res.json(result);
});

// ── RECENT TRADES ─────────────────────────────────────────────────────────────
router.get("/dashboard/recent-trades", async (req, res) => {
  const { accountId, limit = "10" } = req.query as Record<string, string>;
  const summaries = await buildCalcSummaries(accountId ? Number(accountId) : undefined);
  const closed = summaries
    .filter((s) => s.status === "closed" && s.closedAt)
    .sort((a, b) => b.closedAt!.getTime() - a.closedAt!.getTime())
    .slice(0, Number(limit));

  // Re-fetch full trade data for these IDs
  const ids = closed.map((s) => s.id);
  if (!ids.length) return res.json([]);

  const rows = await db
    .select({ trade: tradesTable, instrument: instrumentsTable, account: accountsTable })
    .from(tradesTable)
    .innerJoin(instrumentsTable, eq(tradesTable.instrumentId, instrumentsTable.id))
    .innerJoin(accountsTable, eq(tradesTable.accountId, accountsTable.id))
    .where(inArray(tradesTable.id, ids));

  const result = closed.map((s) => {
    const row = rows.find((r) => r.trade.id === s.id);
    if (!row) return null;
    return {
      id: s.id,
      accountName: row.account.name,
      instrumentSymbol: row.instrument.symbol,
      direction: row.trade.direction,
      status: s.status,
      netPnl: s.netPnl,
      outcome: s.outcome,
      openedAt: s.openedAt,
      closedAt: s.closedAt,
      settlementCurrency: s.settlementCurrency,
    };
  }).filter(Boolean);

  res.json(result);
});

// ── WIN/LOSS ──────────────────────────────────────────────────────────────────
router.get("/dashboard/win-loss", async (req, res) => {
  const { accountId, dateFrom, dateTo } = req.query as Record<string, string>;
  const summaries = await buildCalcSummaries(accountId ? Number(accountId) : undefined, dateFrom, dateTo);
  const closed = summaries.filter((s) => s.status === "closed");

  const byCurrency = groupBy(closed, (s) => s.settlementCurrency);
  const result = Object.entries(byCurrency).map(([currency, trades]) => {
    const outcomes = ["win", "loss", "breakeven"] as const;
    return {
      currency,
      breakdown: outcomes.map((outcome) => {
        const group = trades.filter((t) => t.outcome === outcome);
        return { outcome, count: group.length, totalPnl: group.reduce((s, t) => s + t.netPnl, 0) };
      }),
    };
  });
  res.json(result);
});

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce<Record<string, T[]>>((acc, item) => {
    const k = key(item);
    (acc[k] ??= []).push(item);
    return acc;
  }, {});
}

export default router;
