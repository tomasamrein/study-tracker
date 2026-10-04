import { dailyStats, enrich, summarize } from "./calc";
import { payoutDays } from "./risk";
import type { CriterionMetric, PhaseGoal, TradingState } from "./types";

export const METRIC_LABEL: Record<CriterionMetric, string> = {
  trades: "Trades registrados",
  expectancy: "Expectativa (R)",
  winrate: "Winrate (%)",
  planPct: "Cumplimiento del plan (%)",
  profitFactor: "Profit factor",
  pnl: "PnL total",
  payoutDays: "Días de retiro (≥ mínimo de la cuenta)",
};

export interface CriterionProgress {
  id: string;
  metric: CriterionMetric;
  target: number;
  value: number | null;
  done: boolean;
  /** 0–100 */
  pct: number;
}

/** Evalúa los criterios de pasaje de una fase con los trades de ese modo. */
export function evaluateGoal(goal: PhaseGoal, state: TradingState): CriterionProgress[] {
  const list = enrich(state.trades.filter((t) => t.modeId === goal.modeId), state.instruments);
  const s = summarize(list);
  const minDay = Math.min(
    ...state.accounts.filter((a) => a.modeId === goal.modeId && a.rules.payoutDayMin != null).map((a) => a.rules.payoutDayMin as number),
  );
  const values: Record<CriterionMetric, number | null> = {
    trades: s.count,
    expectancy: s.expectancyR,
    winrate: s.winrate,
    planPct: s.planPct,
    profitFactor: s.profitFactor,
    pnl: s.totalPnl,
    payoutDays: Number.isFinite(minDay) ? payoutDays(dailyStats(list), minDay).length : null,
  };
  return goal.criteria.map((c) => {
    const value = values[c.metric];
    const done = value != null && value >= c.target;
    const pct = value == null ? 0 : c.target <= 0 ? (done ? 100 : 0) : Math.max(0, Math.min(100, (value / c.target) * 100));
    return { id: c.id, metric: c.metric, target: c.target, value, done, pct };
  });
}
