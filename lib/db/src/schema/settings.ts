import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { accountsTable } from "./accounts";

export const DASHBOARD_DATE_RANGES = ["this_month", "last_30_days", "this_year", "all_time"] as const;
export type DashboardDateRange = (typeof DASHBOARD_DATE_RANGES)[number];

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  timezone: text("timezone").notNull().default("UTC"),
  defaultAccountId: integer("default_account_id").references(() => accountsTable.id, { onDelete: "set null" }),
  dashboardDefaultDateRange: text("dashboard_default_date_range")
    .notNull()
    .default("this_month")
    .$type<DashboardDateRange>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSettingsSchema = createInsertSchema(settingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const selectSettingsSchema = createSelectSchema(settingsTable);

export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;
