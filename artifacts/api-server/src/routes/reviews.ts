import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { tradeReviewsTable, tradesTable } from "@workspace/db";

const router = Router();

router.get("/trades/:tradeId/review", async (req, res) => {
  const tradeId = Number(req.params.tradeId);
  const [trade] = await db.select().from(tradesTable).where(eq(tradesTable.id, tradeId));
  if (!trade) return res.status(404).json({ error: "Trade not found" });

  const [review] = await db
    .select()
    .from(tradeReviewsTable)
    .where(eq(tradeReviewsTable.tradeId, tradeId));
  res.json(review ?? { id: null, tradeId, reviewNotes: null, whatWentWell: null, whatWentWrong: null, ruleAdherence: null, tradeQuality: null, lessonsLearned: null, createdAt: null, updatedAt: null });
});

router.put("/trades/:tradeId/review", async (req, res) => {
  const tradeId = Number(req.params.tradeId);
  const [trade] = await db.select().from(tradesTable).where(eq(tradesTable.id, tradeId));
  if (!trade) return res.status(404).json({ error: "Trade not found" });

  const { reviewNotes, whatWentWell, whatWentWrong, ruleAdherence, tradeQuality, lessonsLearned } = req.body;

  const existing = await db.select().from(tradeReviewsTable).where(eq(tradeReviewsTable.tradeId, tradeId));

  const values = {
    tradeId,
    reviewNotes: reviewNotes ?? null,
    whatWentWell: whatWentWell ?? null,
    whatWentWrong: whatWentWrong ?? null,
    ruleAdherence: ruleAdherence ?? null,
    tradeQuality: tradeQuality ?? null,
    lessonsLearned: lessonsLearned ?? null,
    updatedAt: new Date(),
  };

  let review;
  if (existing.length > 0) {
    const [r] = await db
      .update(tradeReviewsTable)
      .set(values as any)
      .where(eq(tradeReviewsTable.tradeId, tradeId))
      .returning();
    review = r;
  } else {
    const [r] = await db
      .insert(tradeReviewsTable)
      .values(values as any)
      .returning();
    review = r;
  }

  res.json(review);
});

export default router;
