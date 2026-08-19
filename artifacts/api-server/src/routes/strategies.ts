import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { strategiesTable, setupsTable } from "@workspace/db";

const router = Router();

async function strategiesWithSetups(rows: typeof strategiesTable.$inferSelect[]) {
  if (!rows.length) return [];
  const allSetups = await db.select().from(setupsTable);
  return rows.map((s) => ({
    ...s,
    setups: allSetups
      .filter((su) => su.strategyId === s.id)
      .map(serSetup),
  }));
}

router.get("/strategies", async (_req, res) => {
  const rows = await db.select().from(strategiesTable);
  res.json(await strategiesWithSetups(rows));
});

router.post("/strategies", async (req, res) => {
  const { name, description, isActive } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });
  const [row] = await db
    .insert(strategiesTable)
    .values({ name, description: description ?? null, isActive: isActive !== false })
    .returning();
  const result = await strategiesWithSetups([row]);
  res.status(201).json(result[0]);
});

router.get("/strategies/:id", async (req, res) => {
  const [row] = await db.select().from(strategiesTable).where(eq(strategiesTable.id, Number(req.params.id)));
  if (!row) return res.status(404).json({ error: "Not found" });
  const result = await strategiesWithSetups([row]);
  res.json(result[0]);
});

router.patch("/strategies/:id", async (req, res) => {
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (req.body.name !== undefined) updates.name = req.body.name;
  if (req.body.description !== undefined) updates.description = req.body.description;
  if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;
  const [row] = await db
    .update(strategiesTable)
    .set(updates as any)
    .where(eq(strategiesTable.id, Number(req.params.id)))
    .returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  const result = await strategiesWithSetups([row]);
  res.json(result[0]);
});

router.delete("/strategies/:id", async (req, res) => {
  const result = await db.delete(strategiesTable).where(eq(strategiesTable.id, Number(req.params.id))).returning();
  if (!result.length) return res.status(404).json({ error: "Not found" });
  res.status(204).send();
});

function serSetup(row: typeof setupsTable.$inferSelect) {
  return { ...row, strategyName: null };
}

export default router;
