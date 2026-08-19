import Decimal from "decimal.js";

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export type ExecutionRow = {
  side: "buy" | "sell";
  price: string | number | null;
  quantity: string | number | null;
  commission?: string | number | null;
  fees?: string | number | null;
};

export type TradeCalcInput = {
  direction: "long" | "short";
  executions: ExecutionRow[];
  initialStopLoss?: string | number | null;
  tradeLevelCostAdjustment?: string | number | null;
  contractMultiplier?: string | number | null;
  accountCurrentBalance?: string | number | null;
  accountStartingBalance?: string | number | null;
};

export type TradeCalcResult = {
  avgEntry: number | null;
  avgExit: number | null;
  positionValue: number | null;
  riskAmount: number | null;
  riskPercentage: number | null;
  openPositionSize: number;
  realizedQuantity: number;
  realizedGrossPnl: number;
  realizedNetPnl: number;
  totalCommissions: number;
  totalFees: number;
  tradeLevelCosts: number;
  plannedR: number | null;
  actualR: number | null;
  openedAt: Date | null;
  closedAt: Date | null;
  durationMinutes: number | null;
  outcome: "win" | "loss" | "breakeven" | null;
};

function d(v: string | number | null | undefined): Decimal {
  if (v == null || v === "") return new Decimal(0);
  return new Decimal(String(v));
}

function safeD(v: string | number | null | undefined): Decimal | null {
  if (v == null || v === "") return null;
  return new Decimal(String(v));
}

export function calcTrade(input: TradeCalcInput): TradeCalcResult {
  const { direction, executions, initialStopLoss, tradeLevelCostAdjustment, contractMultiplier } = input;
  const mult = safeD(contractMultiplier) ?? new Decimal(1);

  const buys = executions.filter((e) => e.side === "buy");
  const sells = executions.filter((e) => e.side === "sell");

  // Entry side = buy for long, sell for short
  const entrySide = direction === "long" ? buys : sells;
  const exitSide = direction === "long" ? sells : buys;

  // Weighted average entry
  let totalEntryQty = new Decimal(0);
  let totalEntryValue = new Decimal(0);
  for (const e of entrySide) {
    const qty = d(e.quantity);
    const price = d(e.price);
    totalEntryQty = totalEntryQty.plus(qty);
    totalEntryValue = totalEntryValue.plus(qty.times(price));
  }
  const avgEntry = totalEntryQty.isZero() ? null : totalEntryValue.div(totalEntryQty);
  const positionValue = avgEntry ? avgEntry.times(totalEntryQty).times(mult) : null;
  const stopLoss = safeD(initialStopLoss);
  let riskAmount: Decimal | null = null;
  if (avgEntry && stopLoss && !totalEntryQty.isZero()) {
    const riskPerUnit = avgEntry.minus(stopLoss).abs();
    if (!riskPerUnit.isZero()) {
      riskAmount = riskPerUnit.times(totalEntryQty).times(mult);
    }
  }
  const currentBalance = safeD(input.accountCurrentBalance);
  const startingBalance = safeD(input.accountStartingBalance);
  const riskBalance = currentBalance?.greaterThan(0)
    ? currentBalance
    : startingBalance?.greaterThan(0)
      ? startingBalance
      : null;
  const riskPercentage = riskAmount && riskBalance
    ? riskAmount.div(riskBalance).times(100)
    : null;

  // Weighted average exit
  let totalExitQty = new Decimal(0);
  let totalExitValue = new Decimal(0);
  for (const e of exitSide) {
    const qty = d(e.quantity);
    const price = d(e.price);
    totalExitQty = totalExitQty.plus(qty);
    totalExitValue = totalExitValue.plus(qty.times(price));
  }
  const avgExit = totalExitQty.isZero() ? null : totalExitValue.div(totalExitQty);

  // Open position = entry qty - exit qty (min 0)
  const openPositionSize = Decimal.max(new Decimal(0), totalEntryQty.minus(totalExitQty));

  // Realized qty = min(entry qty, exit qty)
  const realizedQty = Decimal.min(totalEntryQty, totalExitQty);

  // Gross P&L on realized portion
  let realizedGrossPnl = new Decimal(0);
  if (avgEntry && !realizedQty.isZero()) {
    const exitPriceForCalc = totalExitQty.isZero() ? new Decimal(0) : totalExitValue.div(totalExitQty);
    if (direction === "long") {
      realizedGrossPnl = exitPriceForCalc.minus(avgEntry).times(realizedQty).times(mult);
    } else {
      realizedGrossPnl = avgEntry.minus(exitPriceForCalc).times(realizedQty).times(mult);
    }
  }

  // Total costs
  let totalCommissions = new Decimal(0);
  let totalFees = new Decimal(0);
  for (const e of executions) {
    totalCommissions = totalCommissions.plus(d(e.commission));
    totalFees = totalFees.plus(d(e.fees));
  }
  const tradeLevelCosts = d(tradeLevelCostAdjustment);
  const realizedNetPnl = realizedGrossPnl.minus(totalCommissions).minus(totalFees).minus(tradeLevelCosts);

  // Actual R
  let actualR: number | null = null;
  if (riskAmount && !realizedQty.isZero()) {
    actualR = realizedNetPnl.div(riskAmount).toNumber();
  }

  // Timestamps
  const allDates = executions.map((e) => {
    // executedAt is a Date or ISO string after Drizzle deserializes
    return undefined as unknown as Date;
  });

  // Outcome
  let outcome: "win" | "loss" | "breakeven" | null = null;
  if (!realizedQty.isZero()) {
    if (realizedNetPnl.greaterThan(0)) outcome = "win";
    else if (realizedNetPnl.lessThan(0)) outcome = "loss";
    else outcome = "breakeven";
  }

  return {
    avgEntry: avgEntry?.toNumber() ?? null,
    avgExit: avgExit?.toNumber() ?? null,
    positionValue: positionValue?.toNumber() ?? null,
    riskAmount: riskAmount?.toNumber() ?? null,
    riskPercentage: riskPercentage?.toNumber() ?? null,
    openPositionSize: openPositionSize.toNumber(),
    realizedQuantity: realizedQty.toNumber(),
    realizedGrossPnl: realizedGrossPnl.toNumber(),
    realizedNetPnl: realizedNetPnl.toNumber(),
    totalCommissions: totalCommissions.toNumber(),
    totalFees: totalFees.toNumber(),
    tradeLevelCosts: tradeLevelCosts.toNumber(),
    plannedR: null,
    actualR,
    openedAt: null,
    closedAt: null,
    durationMinutes: null,
    outcome,
  };
}

export function calcTradeWithDates(
  input: TradeCalcInput & { executionDates: Array<{ side: "buy" | "sell"; executedAt: Date | string }> },
): TradeCalcResult {
  const base = calcTrade(input);
  const { direction, executionDates, initialStopLoss, contractMultiplier } = input;
  const mult = safeD(contractMultiplier) ?? new Decimal(1);

  const entrySideDates = executionDates.filter((e) => (direction === "long" ? e.side === "buy" : e.side === "sell"));
  const exitSideDates = executionDates.filter((e) => (direction === "long" ? e.side === "sell" : e.side === "buy"));

  const toDate = (v: Date | string) => (v instanceof Date ? v : new Date(v));

  const openedAt =
    entrySideDates.length > 0
      ? new Date(Math.min(...entrySideDates.map((e) => toDate(e.executedAt).getTime())))
      : null;

  const closedAt =
    base.openPositionSize === 0 && exitSideDates.length > 0
      ? new Date(Math.max(...exitSideDates.map((e) => toDate(e.executedAt).getTime())))
      : null;

  let durationMinutes: number | null = null;
  if (openedAt && closedAt) {
    durationMinutes = Math.round((closedAt.getTime() - openedAt.getTime()) / 60000);
  }

  // Planned R (needs avgEntry from base)
  let plannedR: number | null = null;
  if (base.avgEntry != null && safeD(initialStopLoss)) {
    const stopD = new Decimal(String(initialStopLoss!));
    const avgEntryD = new Decimal(base.avgEntry);
    const riskPerUnit = avgEntryD.minus(stopD).abs();
    // We need entry qty to compute planned R — passed in input.executions
    const entrySideExec = input.executions.filter((e) =>
      direction === "long" ? e.side === "buy" : e.side === "sell",
    );
    let totalEntryQty = new Decimal(0);
    for (const e of entrySideExec) totalEntryQty = totalEntryQty.plus(d(e.quantity));
    if (!riskPerUnit.isZero() && !totalEntryQty.isZero()) {
      const totalRisk = riskPerUnit.times(totalEntryQty).times(mult);
      plannedR = new Decimal(base.realizedNetPnl).div(totalRisk).toNumber();
    }
  }

  return { ...base, openedAt, closedAt, durationMinutes, plannedR };
}
