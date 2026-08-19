import { pgTable, serial, text, boolean, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const accountsTable = pgTable("accounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  broker: text("broker"),
  accountType: text("account_type"),
  baseCurrency: text("base_currency").notNull(),
  startingBalance: numeric("starting_balance", { precision: 20, scale: 8 }),
  currentBalance: numeric("current_balance", { precision: 20, scale: 8 }),
  defaultRiskPercentage: numeric("default_risk_percentage", { precision: 8, scale: 4 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAccountSchema = createInsertSchema(accountsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const selectAccountSchema = createSelectSchema(accountsTable);

export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accountsTable.$inferSelect;
