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
