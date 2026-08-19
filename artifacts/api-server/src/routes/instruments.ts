import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { instrumentsTable } from "@workspace/db";

const router = Router();

router.get("/instruments", async (req, res) => {
  const { assetClass, isActive } = req.query;
  let rows = await db.select().from(instrumentsTable);
  if (assetClass) rows = rows.filter((r) => r.assetClass === assetClass);
  if (isActive !== undefined) rows = rows.filter((r) => r.isActive === (isActive === "true"));
  res.json(rows.map(ser));
});

router.post("/instruments", async (req, res) => {
  const { symbol, name, assetClass, settlementCurrency, quantityUnit, contractMultiplier, isActive } = req.body;
  if (!symbol || !name || !assetClass || !settlementCurrency || !quantityUnit) {
    return res.status(400).json({ error: "symbol, name, assetClass, settlementCurrency, quantityUnit required" });
  }
  const [row] = await db
    .insert(instrumentsTable)
    .values({
      symbol,
      name,
      assetClass,
      settlementCurrency,
      quantityUnit,
      contractMultiplier: contractMultiplier?.toString() ?? null,
      isActive: isActive !== false,
    })
    .returning();
  res.status(201).json(ser(row));
});

router.get("/instruments/:id", async (req, res) => {
  const [row] = await db.select().from(instrumentsTable).where(eq(instrumentsTable.id, Number(req.params.id)));
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(ser(row));
});

router.patch("/instruments/:id", async (req, res) => {
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const k of ["symbol", "name", "assetClass", "settlementCurrency", "quantityUnit", "isActive"]) {
    if (req.body[k] !== undefined) updates[k === "assetClass" ? "assetClass" : k] = req.body[k];
  }
  if (req.body.contractMultiplier !== undefined) {
    updates.contractMultiplier = req.body.contractMultiplier?.toString() ?? null;
  }
  const [row] = await db
    .update(instrumentsTable)
    .set(updates as any)
    .where(eq(instrumentsTable.id, Number(req.params.id)))
    .returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(ser(row));
});

router.delete("/instruments/:id", async (req, res) => {
  const result = await db.delete(instrumentsTable).where(eq(instrumentsTable.id, Number(req.params.id))).returning();
  if (!result.length) return res.status(404).json({ error: "Not found" });
  res.status(204).send();
});

function ser(row: typeof instrumentsTable.$inferSelect) {
  return {
    ...row,
    contractMultiplier: row.contractMultiplier ? Number(row.contractMultiplier) : null,
  };
}

export default router;
