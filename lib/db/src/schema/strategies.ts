import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const strategiesTable = pgTable("strategies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertStrategySchema = createInsertSchema(strategiesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const selectStrategySchema = createSelectSchema(strategiesTable);

export type InsertStrategy = z.infer<typeof insertStrategySchema>;
export type Strategy = typeof strategiesTable.$inferSelect;
