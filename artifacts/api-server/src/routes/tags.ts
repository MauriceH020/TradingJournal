import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { tagsTable } from "@workspace/db";

const router = Router();

router.get("/tags", async (_req, res) => {
  const rows = await db.select().from(tagsTable);
  res.json(rows);
});

router.post("/tags", async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });
  const [row] = await db.insert(tagsTable).values({ name }).returning();
  res.status(201).json(row);
});

router.delete("/tags/:id", async (req, res) => {
  const result = await db.delete(tagsTable).where(eq(tagsTable.id, Number(req.params.id))).returning();
  if (!result.length) return res.status(404).json({ error: "Not found" });
  res.status(204).send();
});

export default router;
