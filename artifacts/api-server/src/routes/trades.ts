import { Router } from "express";
import { and, eq, gte, lte, inArray, desc, asc, count, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  tradesTable,
  executionsTable,
  tradeConfluencesTable,
  tradeTagsTable,
  accountsTable,
  instrumentsTable,
  strategiesTable,
  setupsTable,
} from "@workspace/db";
import { getTradeDetail } from "../lib/trade-queries";
import { calcTradeWithDates } from "../lib/calc";

const router = Router();

type TradeSortKey = "createdAt" | "openedAt" | "instrument" | "direction" | "size" | "avgEntry" | "avgExit" | "netPnl" | "actualR" | "status";

// ── LIST ─────────────────────────────────────────────────────────────────────
router.get("/trades", async (req, res) => {
  const {
    accountId,
    instrumentId,
    assetClass,
    direction,
    status,
    strategyId,
    setupId,
    outcome,
    dateFrom,
    dateTo,
    sortBy = "openedAt",
    sortDir = "desc",
    limit = "100",
    offset = "0",
  } = req.query as Record<string, string>;

  // Fetch all trades with joins
  const rows = await db
    .select({
      trade: tradesTable,
      account: accountsTable,
      instrument: instrumentsTable,
      strategy: strategiesTable,
      setup: setupsTable,
    })
    .from(tradesTable)
    .innerJoin(accountsTable, eq(tradesTable.accountId, accountsTable.id))
    .innerJoin(instrumentsTable, eq(tradesTable.instrumentId, instrumentsTable.id))
    .leftJoin(strategiesTable, eq(tradesTable.strategyId, strategiesTable.id))
    .leftJoin(setupsTable, eq(tradesTable.setupId, setupsTable.id));

  // Fetch executions for all returned trades at once
  const tradeIds = rows.map((r) => r.trade.id);
  const allExecutions =
    tradeIds.length > 0
      ? await db
          .select()
          .from(executionsTable)
          .where(inArray(executionsTable.tradeId, tradeIds))
          .orderBy(executionsTable.executedAt)
      : [];

  // Build summaries with calculated values
  let summaries = rows.map((row) => {
    const t = row.trade;
    const execs = allExecutions.filter((e) => e.tradeId === t.id);
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

    // Derive status
    const entrySide = t.direction === "long" ? "buy" : "sell";
    const exitSide = t.direction === "long" ? "sell" : "buy";
    let entryQty = 0, exitQty = 0;
    for (const e of execs) {
      if (e.side === entrySide) entryQty += Number(e.quantity);
      if (e.side === exitSide) exitQty += Number(e.quantity);
    }
    const derivedStatus: "open" | "partially_closed" | "closed" =
      execs.length === 0 || entryQty === 0
        ? "open"
        : exitQty >= entryQty
        ? "closed"
        : exitQty > 0
        ? "partially_closed"
        : "open";

    return {
      id: t.id,
      accountId: t.accountId,
      accountName: row.account.name,
      instrumentId: t.instrumentId,
      instrumentSymbol: row.instrument.symbol,
      instrumentName: row.instrument.name,
      assetClass: row.instrument.assetClass,
      settlementCurrency: row.instrument.settlementCurrency,
      direction: t.direction,
      status: derivedStatus,
      strategyId: t.strategyId ?? null,
      strategyName: row.strategy?.name ?? null,
      setupId: t.setupId ?? null,
      setupName: row.setup?.name ?? null,
      tradeTimezone: t.tradeTimezone,
      notes: t.notes ?? null,
      tradeLevelCostAdjustment: t.tradeLevelCostAdjustment ? Number(t.tradeLevelCostAdjustment) : null,
      plannedEntry: t.plannedEntry ? Number(t.plannedEntry) : null,
      initialStopLoss: t.initialStopLoss ? Number(t.initialStopLoss) : null,
      profitTarget: t.profitTarget ? Number(t.profitTarget) : null,
      plannedPositionSize: t.plannedPositionSize ? Number(t.plannedPositionSize) : null,
      plannedRisk: t.plannedRisk ? Number(t.plannedRisk) : null,
      plannedRiskPercentage: t.plannedRiskPercentage ? Number(t.plannedRiskPercentage) : null,
      calculated: calc,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    };
  });

  // Apply filters
  if (accountId) summaries = summaries.filter((s) => s.accountId === Number(accountId));
  if (instrumentId) summaries = summaries.filter((s) => s.instrumentId === Number(instrumentId));
  if (assetClass) summaries = summaries.filter((s) => s.assetClass === assetClass);
  if (direction) summaries = summaries.filter((s) => s.direction === direction);
  if (status) summaries = summaries.filter((s) => s.status === status);
  if (strategyId) summaries = summaries.filter((s) => s.strategyId === Number(strategyId));
  if (setupId) summaries = summaries.filter((s) => s.setupId === Number(setupId));
  if (outcome) summaries = summaries.filter((s) => s.calculated.outcome === outcome);
  if (dateFrom) summaries = summaries.filter((s) => s.calculated.openedAt && s.calculated.openedAt >= new Date(dateFrom));
  if (dateTo) summaries = summaries.filter((s) => s.calculated.openedAt && s.calculated.openedAt <= new Date(dateTo + "T23:59:59Z"));

  const total = summaries.length;

  // Sort
  const getSortValue = (summary: (typeof summaries)[number]): string | number => {
    switch (sortBy as TradeSortKey) {
      case "createdAt":
        return summary.createdAt?.getTime() ?? 0;
      case "openedAt":
        return summary.calculated.openedAt?.getTime() ?? 0;
      case "instrument":
        return summary.instrumentSymbol;
      case "direction":
        return summary.direction;
      case "size":
        return summary.calculated.openPositionSize + summary.calculated.realizedQuantity;
      case "avgEntry":
        return summary.calculated.avgEntry ?? 0;
      case "avgExit":
        return summary.calculated.avgExit ?? 0;
      case "netPnl":
        return summary.calculated.realizedNetPnl;
      case "actualR":
        return summary.calculated.actualR ?? 0;
      case "status":
        return summary.status;
      default:
        return summary.calculated.openedAt?.getTime() ?? 0;
    }
  };

  summaries.sort((a, b) => {
    const aVal = getSortValue(a);
    const bVal = getSortValue(b);
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortDir === "desc" ? bVal - aVal : aVal - bVal;
    }
    return sortDir === "desc"
      ? String(bVal).localeCompare(String(aVal))
      : String(aVal).localeCompare(String(bVal));
  });

  // Paginate
  const paginated = summaries.slice(Number(offset), Number(offset) + Number(limit));

  res.json({ trades: paginated, total, limit: Number(limit), offset: Number(offset) });
});

// ── CREATE ───────────────────────────────────────────────────────────────────
router.post("/trades", async (req, res) => {
  const {
    accountId,
    instrumentId,
    direction,
    strategyId,
    setupId,
    confluenceIds,
    tagIds,
    plannedEntry,
    initialStopLoss,
    profitTarget,
    plannedPositionSize,
    plannedRisk,
    plannedRiskPercentage,
    tradeLevelCostAdjustment,
    notes,
    tradeTimezone,
    executions: execInput,
  } = req.body;

  if (!accountId || !instrumentId || !direction) {
    return res.status(400).json({ error: "accountId, instrumentId, direction required" });
  }

  const [trade] = await db
    .insert(tradesTable)
    .values({
      accountId,
      instrumentId,
      direction,
      strategyId: strategyId ?? null,
      setupId: setupId ?? null,
      plannedEntry: plannedEntry?.toString() ?? null,
      initialStopLoss: initialStopLoss?.toString() ?? null,
      profitTarget: profitTarget?.toString() ?? null,
      plannedPositionSize: plannedPositionSize?.toString() ?? null,
      plannedRisk: plannedRisk?.toString() ?? null,
      plannedRiskPercentage: plannedRiskPercentage?.toString() ?? null,
      tradeLevelCostAdjustment: tradeLevelCostAdjustment?.toString() ?? null,
      notes: notes ?? null,
      tradeTimezone: tradeTimezone ?? "UTC",
    })
    .returning();

  // Insert executions
  if (execInput?.length) {
    await db.insert(executionsTable).values(
      execInput.map((e: any) => ({
        tradeId: trade.id,
        side: e.side,
        executedAt: new Date(e.executedAt),
        price: e.price.toString(),
        quantity: e.quantity.toString(),
        quantityUnit: e.quantityUnit,
        commission: e.commission?.toString() ?? null,
        fees: e.fees?.toString() ?? null,
        notes: e.notes ?? null,
      })),
    );
  }

  // Set confluences
  if (confluenceIds?.length) {
    await db.insert(tradeConfluencesTable).values(
      confluenceIds.map((cid: number) => ({ tradeId: trade.id, confluenceId: cid })),
    );
  }

  // Set tags
  if (tagIds?.length) {
    await db.insert(tradeTagsTable).values(
      tagIds.map((tid: number) => ({ tradeId: trade.id, tagId: tid })),
    );
  }

  const detail = await getTradeDetail(trade.id);
  res.status(201).json(detail);
});

// ── GET ──────────────────────────────────────────────────────────────────────
router.get("/trades/:id", async (req, res) => {
  const detail = await getTradeDetail(Number(req.params.id));
  if (!detail) return res.status(404).json({ error: "Not found" });
  res.json(detail);
});

// ── UPDATE ───────────────────────────────────────────────────────────────────
router.patch("/trades/:id", async (req, res) => {
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  const fields = [
    "strategyId", "setupId", "plannedEntry", "initialStopLoss", "profitTarget",
    "plannedPositionSize", "plannedRisk", "plannedRiskPercentage",
    "tradeLevelCostAdjustment", "notes", "tradeTimezone",
  ];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      const numericFields = ["plannedEntry", "initialStopLoss", "profitTarget", "plannedPositionSize", "plannedRisk", "plannedRiskPercentage", "tradeLevelCostAdjustment"];
      updates[f] = numericFields.includes(f) && req.body[f] !== null
        ? req.body[f].toString()
        : req.body[f] ?? null;
    }
  }
  const [row] = await db
    .update(tradesTable)
    .set(updates as any)
    .where(eq(tradesTable.id, Number(req.params.id)))
    .returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  const detail = await getTradeDetail(Number(req.params.id));
  res.json(detail);
});

// ── SET CONFLUENCES ───────────────────────────────────────────────────────────
router.put("/trades/:tradeId/confluences", async (req, res) => {
  const tradeId = Number(req.params.tradeId);
  const { confluenceIds } = req.body;
  await db.delete(tradeConfluencesTable).where(eq(tradeConfluencesTable.tradeId, tradeId));
  if (confluenceIds?.length) {
    await db.insert(tradeConfluencesTable).values(
      confluenceIds.map((cid: number) => ({ tradeId, confluenceId: cid })),
    );
  }
  const detail = await getTradeDetail(tradeId);
  if (!detail) return res.status(404).json({ error: "Not found" });
  res.json(detail);
});

// ── SET TAGS ─────────────────────────────────────────────────────────────────
router.put("/trades/:tradeId/tags", async (req, res) => {
  const tradeId = Number(req.params.tradeId);
  const { tagIds } = req.body;
  await db.delete(tradeTagsTable).where(eq(tradeTagsTable.tradeId, tradeId));
  if (tagIds?.length) {
    await db.insert(tradeTagsTable).values(
      tagIds.map((tid: number) => ({ tradeId, tagId: tid })),
    );
  }
  const detail = await getTradeDetail(tradeId);
  if (!detail) return res.status(404).json({ error: "Not found" });
  res.json(detail);
});

// ── DELETE ───────────────────────────────────────────────────────────────────
router.delete("/trades/:id", async (req, res) => {
  const result = await db
    .delete(tradesTable)
    .where(eq(tradesTable.id, Number(req.params.id)))
    .returning();
  if (!result.length) return res.status(404).json({ error: "Not found" });
  res.status(204).send();
});

export default router;
