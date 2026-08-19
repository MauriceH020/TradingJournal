import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const confluenceCategoriesTable = pgTable("confluence_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const confluencesTable = pgTable("confluences", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull().references(() => confluenceCategoriesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertConfluenceCategorySchema = createInsertSchema(confluenceCategoriesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const selectConfluenceCategorySchema = createSelectSchema(confluenceCategoriesTable);

export const insertConfluenceSchema = createInsertSchema(confluencesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const selectConfluenceSchema = createSelectSchema(confluencesTable);

export type InsertConfluenceCategory = z.infer<typeof insertConfluenceCategorySchema>;
export type ConfluenceCategory = typeof confluenceCategoriesTable.$inferSelect;

export type InsertConfluence = z.infer<typeof insertConfluenceSchema>;
export type Confluence = typeof confluencesTable.$inferSelect;
