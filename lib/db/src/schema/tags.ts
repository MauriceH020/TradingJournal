import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tagsTable = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTagSchema = createInsertSchema(tagsTable).omit({ id: true, createdAt: true });
export const selectTagSchema = createSelectSchema(tagsTable);

export type InsertTag = z.infer<typeof insertTagSchema>;
export type Tag = typeof tagsTable.$inferSelect;
