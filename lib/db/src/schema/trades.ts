import {
  pgTable, serial, text, boolean, numeric, integer, timestamp, index,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { accountsTable } from "./accounts";
import { instrumentsTable } from "./instruments";
import { strategiesTable } from "./strategies";
import { setupsTable } from "./setups";
import { confluencesTable } from "./confluences";
import { tagsTable } from "./tags";

// Direction and status enums as string literals (no pgEnum — simpler migrations)
export const TRADE_DIRECTIONS = ["long", "short"] as const;
export const TRADE_STATUSES = ["open", "partially_closed", "closed"] as const;
export type TradeDirection = (typeof TRADE_DIRECTIONS)[number];
export type TradeStatus = (typeof TRADE_STATUSES)[number];

export const tradesTable = pgTable(
  "trades",
  {
    id: serial("id").primaryKey(),
    accountId: integer("account_id")
      .notNull()
      .references(() => accountsTable.id, { onDelete: "restrict" }),
    instrumentId: integer("instrument_id")
      .notNull()
      .references(() => instrumentsTable.id, { onDelete: "restrict" }),
    direction: text("direction").notNull().$type<TradeDirection>(),
    status: text("status").notNull().default("open").$type<TradeStatus>(),

    strategyId: integer("strategy_id").references(() => strategiesTable.id, { onDelete: "set null" }),
    setupId: integer("setup_id").references(() => setupsTable.id, { onDelete: "set null" }),

    // Plan / pre-trade data (all optional)
    plannedEntry: numeric("planned_entry", { precision: 20, scale: 8 }),
    initialStopLoss: numeric("initial_stop_loss", { precision: 20, scale: 8 }),
    profitTarget: numeric("profit_target", { precision: 20, scale: 8 }),
    plannedPositionSize: numeric("planned_position_size", { precision: 20, scale: 8 }),
    plannedRisk: numeric("planned_risk", { precision: 20, scale: 8 }),
    plannedRiskPercentage: numeric("planned_risk_percentage", { precision: 8, scale: 4 }),

    // Optional manual cost adjustment (funding, swap, etc.)
    tradeLevelCostAdjustment: numeric("trade_level_cost_adjustment", { precision: 20, scale: 8 }),

    notes: text("notes"),
    tradeTimezone: text("trade_timezone").notNull().default("UTC"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_trades_account_id").on(t.accountId),
    index("idx_trades_instrument_id").on(t.instrumentId),
    index("idx_trades_status").on(t.status),
    index("idx_trades_strategy_id").on(t.strategyId),
  ],
);

// Executions: individual fills / partial fills
export const executionsTable = pgTable(
  "executions",
  {
    id: serial("id").primaryKey(),
    tradeId: integer("trade_id")
      .notNull()
      .references(() => tradesTable.id, { onDelete: "cascade" }),
    side: text("side").notNull().$type<"buy" | "sell">(),
    executedAt: timestamp("executed_at", { withTimezone: true }).notNull(),
    price: numeric("price", { precision: 20, scale: 8 }).notNull(),
    quantity: numeric("quantity", { precision: 20, scale: 8 }).notNull(),
    quantityUnit: text("quantity_unit").notNull(),
    commission: numeric("commission", { precision: 20, scale: 8 }),
    fees: numeric("fees", { precision: 20, scale: 8 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_executions_trade_id").on(t.tradeId),
    index("idx_executions_executed_at").on(t.executedAt),
  ],
);

// Junction: trade ↔ confluences
export const tradeConfluencesTable = pgTable("trade_confluences", {
  tradeId: integer("trade_id")
    .notNull()
    .references(() => tradesTable.id, { onDelete: "cascade" }),
  confluenceId: integer("confluence_id")
    .notNull()
    .references(() => confluencesTable.id, { onDelete: "cascade" }),
});

// Junction: trade ↔ tags
export const tradeTagsTable = pgTable("trade_tags", {
  tradeId: integer("trade_id")
    .notNull()
    .references(() => tradesTable.id, { onDelete: "cascade" }),
  tagId: integer("tag_id")
    .notNull()
    .references(() => tagsTable.id, { onDelete: "cascade" }),
});

// Post-trade review
export const tradeReviewsTable = pgTable("trade_reviews", {
  id: serial("id").primaryKey(),
  tradeId: integer("trade_id")
    .notNull()
    .unique()
    .references(() => tradesTable.id, { onDelete: "cascade" }),
  reviewNotes: text("review_notes"),
  whatWentWell: text("what_went_well"),
  whatWentWrong: text("what_went_wrong"),
  // 1 = followed rules perfectly, 5 = broke all rules
  ruleAdherence: integer("rule_adherence"),
  // 1 = best trade, 5 = poor trade
  tradeQuality: integer("trade_quality"),
  lessonsLearned: text("lessons_learned"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTradeSchema = createInsertSchema(tradesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const selectTradeSchema = createSelectSchema(tradesTable);
export const insertExecutionSchema = createInsertSchema(executionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const selectExecutionSchema = createSelectSchema(executionsTable);
export const insertTradeReviewSchema = createInsertSchema(tradeReviewsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const selectTradeReviewSchema = createSelectSchema(tradeReviewsTable);

export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof tradesTable.$inferSelect;
export type InsertExecution = z.infer<typeof insertExecutionSchema>;
export type Execution = typeof executionsTable.$inferSelect;
export type InsertTradeReview = z.infer<typeof insertTradeReviewSchema>;
export type TradeReview = typeof tradeReviewsTable.$inferSelect;
