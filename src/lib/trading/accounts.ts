import type { TradingAccount } from "./types";

export interface AttemptSummary {
  total: number;
  active: number;
  passed: number;
  lost: number;
  archived: number;
  spent: number;
}

/** Historial de intentos (ej. evals pagadas/aprobadas/perdidas y gasto). */
export function attemptSummary(accounts: TradingAccount[], modeId?: string): AttemptSummary {
  const list = modeId ? accounts.filter((a) => a.modeId === modeId) : accounts;
  return {
    total: list.length,
    active: list.filter((a) => a.status === "activa").length,
    passed: list.filter((a) => a.status === "aprobada").length,
    lost: list.filter((a) => a.status === "perdida").length,
    archived: list.filter((a) => a.status === "archivada").length,
    spent: list.reduce((sum, a) => sum + (Number(a.cost) || 0), 0),
  };
}

import type { Expense, Payout } from "./types";

export interface FinanceSummary {
  accountCosts: number;
  expenses: number;
  spent: number;
  withdrawn: number;
  net: number;
}

/**
 * Resumen financiero: costo de cuentas + gastos extra (reactivaciones,
 * renovaciones de cuentas recurrentes, datos…) vs. retiros.
 */
export function financeSummary(accounts: TradingAccount[], expenses: Expense[], payouts: Payout[]): FinanceSummary {
  const accountCosts = accounts.reduce((s, a) => s + (Number(a.cost) || 0), 0);
  const ex = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const withdrawn = payouts.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  return { accountCosts, expenses: ex, spent: accountCosts + ex, withdrawn, net: withdrawn - accountCosts - ex };
}
