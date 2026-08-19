import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { confluenceCategoriesTable, confluencesTable } from "@workspace/db";

const router = Router();

async function categoryWithConfluences(row: typeof confluenceCategoriesTable.$inferSelect) {
  const confluences = await db
    .select()
    .from(confluencesTable)
    .where(eq(confluencesTable.categoryId, row.id));
  return {
    ...row,
    confluences: confluences.map((c) => ({
      ...c,
      categoryName: row.name,
    })),
  };
}

// Categories
router.get("/confluence-categories", async (_req, res) => {
  const rows = await db.select().from(confluenceCategoriesTable);
  res.json(await Promise.all(rows.map(categoryWithConfluences)));
});

router.post("/confluence-categories", async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });
  const [row] = await db.insert(confluenceCategoriesTable).values({ name }).returning();
  res.status(201).json(await categoryWithConfluences(row));
});

router.patch("/confluence-categories/:id", async (req, res) => {
  const { name } = req.body;
  const [row] = await db
    .update(confluenceCategoriesTable)
    .set({ name, updatedAt: new Date() } as any)
    .where(eq(confluenceCategoriesTable.id, Number(req.params.id)))
    .returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(await categoryWithConfluences(row));
});

router.delete("/confluence-categories/:id", async (req, res) => {
  const result = await db
    .delete(confluenceCategoriesTable)
    .where(eq(confluenceCategoriesTable.id, Number(req.params.id)))
    .returning();
  if (!result.length) return res.status(404).json({ error: "Not found" });
  res.status(204).send();
});

// Confluences
router.post("/confluences", async (req, res) => {
  const { categoryId, name, isActive } = req.body;
  if (!categoryId || !name) return res.status(400).json({ error: "categoryId and name required" });
  const [row] = await db
    .insert(confluencesTable)
    .values({ categoryId, name, isActive: isActive !== false })
    .returning();
  const [cat] = await db
    .select()
    .from(confluenceCategoriesTable)
    .where(eq(confluenceCategoriesTable.id, row.categoryId));
  res.status(201).json({ ...row, categoryName: cat?.name ?? "" });
});

router.patch("/confluences/:id", async (req, res) => {
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (req.body.categoryId !== undefined) updates.categoryId = req.body.categoryId;
  if (req.body.name !== undefined) updates.name = req.body.name;
  if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;
  const [row] = await db
    .update(confluencesTable)
    .set(updates as any)
    .where(eq(confluencesTable.id, Number(req.params.id)))
    .returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  const [cat] = await db
    .select()
    .from(confluenceCategoriesTable)
    .where(eq(confluenceCategoriesTable.id, row.categoryId));
  res.json({ ...row, categoryName: cat?.name ?? "" });
});

router.delete("/confluences/:id", async (req, res) => {
  const result = await db
    .delete(confluencesTable)
    .where(eq(confluencesTable.id, Number(req.params.id)))
    .returning();
  if (!result.length) return res.status(404).json({ error: "Not found" });
  res.status(204).send();
});

export default router;
