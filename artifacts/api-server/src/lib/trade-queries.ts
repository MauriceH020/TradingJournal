import { eq, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  tradesTable,
  executionsTable,
  tradeConfluencesTable,
  tradeTagsTable,
  tradeReviewsTable,
  confluencesTable,
  confluenceCategoriesTable,
  tagsTable,
  accountsTable,
  instrumentsTable,
  strategiesTable,
  setupsTable,
} from "@workspace/db";
import { calcTradeWithDates } from "./calc";
import Decimal from "decimal.js";

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

// Derive trade status from executions
function deriveStatus(direction: string, executions: Array<{ side: string; quantity: string | null }>): "open" | "partially_closed" | "closed" {
  const entrySide = direction === "long" ? "buy" : "sell";
  const exitSide = direction === "long" ? "sell" : "buy";

  let entryQty = new Decimal(0);
  let exitQty = new Decimal(0);
  for (const e of executions) {
    if (e.side === entrySide) entryQty = entryQty.plus(e.quantity ?? 0);
    if (e.side === exitSide) exitQty = exitQty.plus(e.quantity ?? 0);
  }

  if (entryQty.isZero()) return "open";
  if (exitQty.isZero()) return "open";
  if (exitQty.greaterThanOrEqualTo(entryQty)) return "closed";
  return "partially_closed";
}

export async function getTradeDetail(tradeId: number) {
  const [trade] = await db
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
    .leftJoin(setupsTable, eq(tradesTable.setupId, setupsTable.id))
    .where(eq(tradesTable.id, tradeId));

  if (!trade) return null;

  const [executions, tradeConfluences, tradeTags, review] = await Promise.all([
    db
      .select()
      .from(executionsTable)
      .where(eq(executionsTable.tradeId, tradeId))
      .orderBy(executionsTable.executedAt),
    db
      .select({ confluenceId: tradeConfluencesTable.confluenceId })
      .from(tradeConfluencesTable)
      .where(eq(tradeConfluencesTable.tradeId, tradeId)),
    db
      .select({ tagId: tradeTagsTable.tagId })
      .from(tradeTagsTable)
      .where(eq(tradeTagsTable.tradeId, tradeId)),
    db
      .select()
      .from(tradeReviewsTable)
      .where(eq(tradeReviewsTable.tradeId, tradeId))
      .limit(1),
  ]);

  // Fetch full confluence and tag rows
  const confluenceIds = tradeConfluences.map((c) => c.confluenceId);
  const tagIds = tradeTags.map((t) => t.tagId);

  const [fullConfluences, fullTags] = await Promise.all([
    confluenceIds.length > 0
      ? db
          .select({
            confluence: confluencesTable,
            category: confluenceCategoriesTable,
          })
          .from(confluencesTable)
          .innerJoin(confluenceCategoriesTable, eq(confluencesTable.categoryId, confluenceCategoriesTable.id))
          .where(inArray(confluencesTable.id, confluenceIds))
      : Promise.resolve([]),
    tagIds.length > 0
      ? db.select().from(tagsTable).where(inArray(tagsTable.id, tagIds))
      : Promise.resolve([]),
  ]);

  // Calculate derived values
  const t = trade.trade;
  const calc = calcTradeWithDates({
    direction: t.direction as "long" | "short",
    executions: executions.map((e) => ({
      side: e.side as "buy" | "sell",
      price: e.price,
      quantity: e.quantity,
      commission: e.commission,
      fees: e.fees,
    })),
    executionDates: executions.map((e) => ({
      side: e.side as "buy" | "sell",
      executedAt: e.executedAt,
    })),
    initialStopLoss: t.initialStopLoss,
    tradeLevelCostAdjustment: t.tradeLevelCostAdjustment,
    contractMultiplier: trade.instrument.contractMultiplier,
  });

  // Derive and update status
  const status = deriveStatus(t.direction, executions);
  if (status !== t.status) {
    await db.update(tradesTable).set({ status, updatedAt: new Date() }).where(eq(tradesTable.id, tradeId));
  }

  return {
    id: t.id,
    accountId: t.accountId,
    accountName: trade.account.name,
    instrumentId: t.instrumentId,
    instrumentSymbol: trade.instrument.symbol,
    instrumentName: trade.instrument.name,
    assetClass: trade.instrument.assetClass,
    settlementCurrency: trade.instrument.settlementCurrency,
    direction: t.direction,
    status,
    strategyId: t.strategyId ?? null,
    strategyName: trade.strategy?.name ?? null,
    setupId: t.setupId ?? null,
    setupName: trade.setup?.name ?? null,
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
    executions: executions.map((e) => ({
      id: e.id,
      tradeId: e.tradeId,
      side: e.side,
      executedAt: e.executedAt,
      price: Number(e.price),
      quantity: Number(e.quantity),
      quantityUnit: e.quantityUnit,
      commission: e.commission ? Number(e.commission) : null,
      fees: e.fees ? Number(e.fees) : null,
      notes: e.notes ?? null,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    })),
    confluences: fullConfluences.map(({ confluence, category }) => ({
      id: confluence.id,
      categoryId: confluence.categoryId,
      categoryName: category.name,
      name: confluence.name,
      isActive: confluence.isActive,
      createdAt: confluence.createdAt,
      updatedAt: confluence.updatedAt,
    })),
    tags: fullTags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      createdAt: tag.createdAt,
    })),
    review: review[0] ?? null,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}
