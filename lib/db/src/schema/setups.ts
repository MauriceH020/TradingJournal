import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { strategiesTable } from "./strategies";

export const setupsTable = pgTable("setups", {
  id: serial("id").primaryKey(),
  strategyId: integer("strategy_id").references(() => strategiesTable.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSetupSchema = createInsertSchema(setupsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const selectSetupSchema = createSelectSchema(setupsTable);

export type InsertSetup = z.infer<typeof insertSetupSchema>;
export type Setup = typeof setupsTable.$inferSelect;
