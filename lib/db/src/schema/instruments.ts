import { pgTable, serial, text, boolean, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const instrumentsTable = pgTable("instruments", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull().unique(),
  name: text("name").notNull(),
  assetClass: text("asset_class").notNull(),
  settlementCurrency: text("settlement_currency").notNull(),
  quantityUnit: text("quantity_unit").notNull(),
  contractMultiplier: numeric("contract_multiplier", { precision: 20, scale: 8 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertInstrumentSchema = createInsertSchema(instrumentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const selectInstrumentSchema = createSelectSchema(instrumentsTable);

export type InsertInstrument = z.infer<typeof insertInstrumentSchema>;
export type Instrument = typeof instrumentsTable.$inferSelect;
