import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { executionsTable } from "@workspace/db";
import { getTradeDetail } from "../lib/trade-queries";

const router = Router();

// ── CREATE (nested under trade) ───────────────────────────────────────────────
router.post("/trades/:tradeId/executions", async (req, res) => {
  const tradeId = Number(req.params.tradeId);
  const { side, executedAt, price, quantity, quantityUnit, commission, fees, notes } = req.body;

  if (!side || !executedAt || !price || !quantity || !quantityUnit) {
    return res.status(400).json({ error: "side, executedAt, price, quantity, quantityUnit required" });
  }

  await db.insert(executionsTable).values({
    tradeId,
    side,
    executedAt: new Date(executedAt),
    price: price.toString(),
    quantity: quantity.toString(),
    quantityUnit,
    commission: commission?.toString() ?? null,
    fees: fees?.toString() ?? null,
    notes: notes ?? null,
  });

  const detail = await getTradeDetail(tradeId);
  if (!detail) return res.status(404).json({ error: "Trade not found" });
  res.status(201).json(detail);
});

// ── UPDATE ───────────────────────────────────────────────────────────────────
router.patch("/executions/:id", async (req, res) => {
  const { side, executedAt, price, quantity, quantityUnit, commission, fees, notes } = req.body;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (side !== undefined) updates.side = side;
  if (executedAt !== undefined) updates.executedAt = new Date(executedAt);
  if (price !== undefined) updates.price = price.toString();
  if (quantity !== undefined) updates.quantity = quantity.toString();
  if (quantityUnit !== undefined) updates.quantityUnit = quantityUnit;
  if (commission !== undefined) updates.commission = commission?.toString() ?? null;
  if (fees !== undefined) updates.fees = fees?.toString() ?? null;
  if (notes !== undefined) updates.notes = notes ?? null;

  const [exec] = await db
    .update(executionsTable)
    .set(updates as any)
    .where(eq(executionsTable.id, Number(req.params.id)))
    .returning();
  if (!exec) return res.status(404).json({ error: "Not found" });

  const detail = await getTradeDetail(exec.tradeId);
  res.json(detail);
});

// ── DELETE ───────────────────────────────────────────────────────────────────
router.delete("/executions/:id", async (req, res) => {
  const [exec] = await db
    .delete(executionsTable)
    .where(eq(executionsTable.id, Number(req.params.id)))
    .returning();
  if (!exec) return res.status(404).json({ error: "Not found" });

  const detail = await getTradeDetail(exec.tradeId);
  res.json(detail);
});

export default router;
