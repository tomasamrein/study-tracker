import { describe, expect, it } from "vitest";
import { freshTradingState, migrateTradingState, LUCID_50K_FLEX_EOD } from "./defaults";
import { attemptSummary } from "./accounts";
import type { TradingAccount } from "./types";

const acc = (p: Partial<TradingAccount>): TradingAccount => ({
  id: "a", name: "A", modeId: "eval", firm: "Lucid", status: "activa", size: 50000,
  startDate: "2026-10-01", cost: 90, recurring: false, rules: { ...LUCID_50K_FLEX_EOD },
  createdAt: "", ...p,
});

describe("migrateTradingState", () => {
  it("devuelve un estado nuevo si no hay nada guardado", () => {
    expect(migrateTradingState(null)).toEqual(freshTradingState());
  });
  it("completa reglas y límites faltantes sin pisar lo guardado", () => {
    const s = migrateTradingState({
      accounts: [{ ...acc({}), rules: { maxLoss: 2500 } as never }],
      settings: { currency: "ARS" } as never,
    });
    expect(s.accounts[0].rules.maxLoss).toBe(2500);
    expect(s.accounts[0].rules.dailyLoss).toBeNull();
    expect(s.settings.currency).toBe("ARS");
    expect(s.settings.limits.warnPct).toBe(50);
    expect(s.modes.length).toBe(5);
  });
});

describe("attemptSummary", () => {
  it("cuenta intentos y gasto por modo", () => {
    const list = [
      acc({ id: "1", status: "perdida" }),
      acc({ id: "2", status: "aprobada" }),
      acc({ id: "3", status: "activa" }),
      acc({ id: "4", modeId: "paper", cost: 0 }),
    ];
    expect(attemptSummary(list, "eval")).toEqual({
      total: 3, active: 1, passed: 1, lost: 1, archived: 0, spent: 270,
    });
    expect(attemptSummary(list).total).toBe(4);
  });
});
