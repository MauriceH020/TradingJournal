import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { setupsTable, strategiesTable } from "@workspace/db";

const router = Router();

async function serSetupWithStrategy(row: typeof setupsTable.$inferSelect) {
  let strategyName: string | null = null;
  if (row.strategyId) {
    const [strat] = await db.select().from(strategiesTable).where(eq(strategiesTable.id, row.strategyId));
    strategyName = strat?.name ?? null;
  }
  return { ...row, strategyName };
}

router.get("/setups", async (req, res) => {
  const { strategyId } = req.query;
  let rows = await db.select().from(setupsTable);
  if (strategyId) rows = rows.filter((r) => r.strategyId === Number(strategyId));
  res.json(await Promise.all(rows.map(serSetupWithStrategy)));
});

router.post("/setups", async (req, res) => {
  const { name, strategyId, description, isActive } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });
  const [row] = await db
    .insert(setupsTable)
    .values({ name, strategyId: strategyId ?? null, description: description ?? null, isActive: isActive !== false })
    .returning();
  res.status(201).json(await serSetupWithStrategy(row));
});

router.patch("/setups/:id", async (req, res) => {
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (req.body.name !== undefined) updates.name = req.body.name;
  if (req.body.strategyId !== undefined) updates.strategyId = req.body.strategyId;
  if (req.body.description !== undefined) updates.description = req.body.description;
  if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;
  const [row] = await db
    .update(setupsTable)
    .set(updates as any)
    .where(eq(setupsTable.id, Number(req.params.id)))
    .returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(await serSetupWithStrategy(row));
});

router.delete("/setups/:id", async (req, res) => {
  const result = await db.delete(setupsTable).where(eq(setupsTable.id, Number(req.params.id))).returning();
  if (!result.length) return res.status(404).json({ error: "Not found" });
  res.status(204).send();
});

export default router;
