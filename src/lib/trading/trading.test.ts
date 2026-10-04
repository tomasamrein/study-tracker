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

import { evaluateGoal } from "./goals";

describe("evaluateGoal", () => {
  it("mide trades, expectativa y cumplimiento del plan del modo", () => {
    const s = freshTradingState();
    const base = { accountId: "a", modeId: "paper", instrumentId: "mnq", direction: "long" as const, entry: 100, stop: 90, contracts: 1, createdAt: "" };
    s.trades = [
      { ...base, id: "1", entryAt: "2026-10-05T10:00", exit: 120, followedPlan: true },
      { ...base, id: "2", entryAt: "2026-10-06T10:00", exit: 90, followedPlan: false },
      { ...base, id: "3", modeId: "backtest", entryAt: "2026-10-06T10:00", exit: 90, followedPlan: true },
    ];
    const goal = s.phaseGoals.find((g) => g.modeId === "paper")!;
    const [trades, exp, plan] = evaluateGoal(goal, s);
    expect(trades).toMatchObject({ value: 2, done: false, pct: 4 });
    expect(exp.value).toBeCloseTo(0.5);
    expect(exp.done).toBe(true);
    expect(plan).toMatchObject({ value: 50, done: false });
  });
});

import { financeSummary } from "./accounts";

describe("financeSummary", () => {
  it("gastado vs retirado", () => {
    const r = financeSummary(
      [acc({ cost: 90 }), acc({ id: "2", cost: 90 })],
      [{ id: "e", date: "2026-10-01", amount: 50, concept: "Reactivación" }],
      [{ id: "p", accountId: "a", date: "2026-10-20", amount: 500 }],
    );
    expect(r).toEqual({ accountCosts: 180, expenses: 50, spent: 230, withdrawn: 500, net: 270 });
  });
});

import { buildSeed, hasSeed, withoutSeed } from "./seed";

describe("seed", () => {
  it("genera datos marcados y se borran con un clic", () => {
    const s = freshTradingState();
    const seed = buildSeed(s, "2026-10-03");
    const full = { ...s, ...seed };
    expect(seed.trades.length).toBeGreaterThan(10);
    expect(hasSeed(full)).toBe(true);
    const clean = withoutSeed({ ...full, accounts: [...full.accounts, acc({ id: "mine" })] });
    expect(hasSeed(clean)).toBe(false);
    expect(clean.accounts.map((a) => a.id)).toEqual(["mine"]);
  });
});
