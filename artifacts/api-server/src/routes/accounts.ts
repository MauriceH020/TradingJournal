import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { accountsTable } from "@workspace/db";

const router = Router();

router.get("/accounts", async (req, res) => {
  const { isActive } = req.query;
  let query = db.select().from(accountsTable);
  const rows = await query;
  const filtered =
    isActive !== undefined
      ? rows.filter((r) => r.isActive === (isActive === "true"))
      : rows;
  res.json(filtered.map(serializeAccount));
});

router.post("/accounts", async (req, res) => {
  const { name, broker, accountType, baseCurrency, startingBalance, currentBalance, defaultRiskPercentage, isActive } = req.body;
  if (!name || !baseCurrency) {
    return res.status(400).json({ error: "name and baseCurrency are required" });
  }
  const [row] = await db
    .insert(accountsTable)
    .values({
      name,
      broker: broker ?? null,
      accountType: accountType ?? null,
      baseCurrency,
      startingBalance: startingBalance?.toString() ?? null,
      currentBalance: currentBalance?.toString() ?? null,
      defaultRiskPercentage: defaultRiskPercentage?.toString() ?? null,
      isActive: isActive !== false,
    })
    .returning();
  res.status(201).json(serializeAccount(row));
});

router.get("/accounts/:id", async (req, res) => {
  const [row] = await db.select().from(accountsTable).where(eq(accountsTable.id, Number(req.params.id)));
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(serializeAccount(row));
});

router.patch("/accounts/:id", async (req, res) => {
  const { name, broker, accountType, baseCurrency, startingBalance, currentBalance, defaultRiskPercentage, isActive } = req.body;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (name !== undefined) updates.name = name;
  if (broker !== undefined) updates.broker = broker;
  if (accountType !== undefined) updates.accountType = accountType;
  if (baseCurrency !== undefined) updates.baseCurrency = baseCurrency;
  if (startingBalance !== undefined) updates.startingBalance = startingBalance?.toString() ?? null;
  if (currentBalance !== undefined) updates.currentBalance = currentBalance?.toString() ?? null;
  if (defaultRiskPercentage !== undefined) updates.defaultRiskPercentage = defaultRiskPercentage?.toString() ?? null;
  if (isActive !== undefined) updates.isActive = isActive;

  const [row] = await db
    .update(accountsTable)
    .set(updates as any)
    .where(eq(accountsTable.id, Number(req.params.id)))
    .returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(serializeAccount(row));
});

router.delete("/accounts/:id", async (req, res) => {
  const result = await db.delete(accountsTable).where(eq(accountsTable.id, Number(req.params.id))).returning();
  if (!result.length) return res.status(404).json({ error: "Not found" });
  res.status(204).send();
});

function serializeAccount(row: typeof accountsTable.$inferSelect) {
  return {
    ...row,
    startingBalance: row.startingBalance ? Number(row.startingBalance) : null,
    currentBalance: row.currentBalance ? Number(row.currentBalance) : null,
    defaultRiskPercentage: row.defaultRiskPercentage ? Number(row.defaultRiskPercentage) : null,
  };
}

export default router;
