import { Router } from "express";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

async function getOrCreateSettings() {
  const rows = await db.select().from(settingsTable);
  if (rows.length > 0) return rows[0];
  const [row] = await db
    .insert(settingsTable)
    .values({ timezone: "UTC", dashboardDefaultDateRange: "this_month" })
    .returning();
  return row;
}

router.get("/settings", async (_req, res) => {
  const settings = await getOrCreateSettings();
  res.json(settings);
});

router.patch("/settings", async (req, res) => {
  const settings = await getOrCreateSettings();
  const { timezone, defaultAccountId, dashboardDefaultDateRange } = req.body;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (timezone !== undefined) updates.timezone = timezone;
  if (defaultAccountId !== undefined) updates.defaultAccountId = defaultAccountId;
  if (dashboardDefaultDateRange !== undefined) updates.dashboardDefaultDateRange = dashboardDefaultDateRange;
  const [row] = await db
    .update(settingsTable)
    .set(updates as any)
    .where(eq(settingsTable.id, settings.id))
    .returning();
  res.json(row);
});

export default router;
