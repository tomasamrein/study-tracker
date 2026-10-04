import { describe, expect, it } from "vitest";
import {
  byTradesPerDay, dailyStats, enrich, equityCurve, lossesToLimit, positionSize, streaks,
  summarize, sumBy, tradeMetrics, validateTrade, weekStart,
} from "./calc";
import { computeDll, computeMll, payoutDays, personalWarnings, alertLevel } from "./risk";
import { LUCID_50K_FLEX_EOD } from "./defaults";
import type { Instrument, Trade } from "./types";

const MNQ: Instrument = { id: "mnq", symbol: "MNQ", name: "", pointValue: 2, commission: 0, micro: true };
let n = 0;
const T = (p: Partial<Trade>): Trade => ({
  id: `t${n++}`, accountId: "a", modeId: "eval", instrumentId: "mnq", direction: "long",
  entryAt: "2026-10-05T10:00", exitAt: "2026-10-05T10:30", entry: 100, stop: 90, exit: 120,
  contracts: 1, followedPlan: true, createdAt: "", ...p,
});

describe("tradeMetrics", () => {
  it("long ganador: PnL, riesgo, R y duración", () => {
    const m = tradeMetrics(T({ target: 130, contracts: 2 }), MNQ);
    expect(m.points).toBe(20);
    expect(m.pnl).toBe(80);
    expect(m.riskUsd).toBe(40);
    expect(m.r).toBe(2);
    expect(m.plannedR).toBe(3);
    expect(m.durationMin).toBe(30);
  });
  it("short perdedor con comisiones del instrumento", () => {
    const m = tradeMetrics(T({ direction: "short", entry: 100, stop: 105, exit: 105, contracts: 3 }), { ...MNQ, commission: 1 });
    expect(m.grossPnl).toBe(-30);
    expect(m.commission).toBe(3);
    expect(m.pnl).toBe(-33);
    expect(m.r).toBeCloseTo(-1.1);
  });
  it("trade sin stop: sin riesgo ni R", () => {
    const m = tradeMetrics(T({ stop: null }), MNQ);
    expect(m.riskUsd).toBeNull();
    expect(m.r).toBeNull();
    expect(m.pnl).toBe(40);
  });
  it("comisión manual pisa la del instrumento", () => {
    expect(tradeMetrics(T({ commission: 5 }), { ...MNQ, commission: 1 }).pnl).toBe(35);
  });
});

describe("validateTrade", () => {
  it("stop del lado equivocado", () => {
    expect(validateTrade(T({ stop: 110 })).stop).toBeDefined();
    expect(validateTrade(T({ direction: "short", stop: 90, exit: 95 })).stop).toBeDefined();
  });
  it("contratos positivos y enteros, salida después de entrada", () => {
    expect(validateTrade(T({ contracts: 0 })).contracts).toBeDefined();
    expect(validateTrade(T({ contracts: 1.5 })).contracts).toBeDefined();
    expect(validateTrade(T({ exitAt: "2026-10-05T09:00" })).exitAt).toBeDefined();
  });
  it("trade válido sin stop", () => {
    expect(validateTrade(T({ stop: null }))).toEqual({});
  });
});

describe("summarize y estadísticas", () => {
  const list = enrich(
    [
      T({ entryAt: "2026-10-05T10:00", exit: 120 }), // +40, 2R
      T({ entryAt: "2026-10-05T11:00", exit: 90, followedPlan: false }), // -20, -1R
      T({ entryAt: "2026-10-06T10:00", exit: 110 }), // +20, 1R
      T({ entryAt: "2026-10-07T10:00", exit: 90 }), // -20, -1R
      T({ entryAt: "2026-10-07T11:00", exit: 95, stop: null }), // -10, sin stop
    ],
    [MNQ],
  );
  const s = summarize(list);
  it("winrate, PF, expectativa", () => {
    expect(s.count).toBe(5);
    expect(s.winrate).toBe(40);
    expect(s.totalPnl).toBe(10);
    expect(s.profitFactor).toBeCloseTo(60 / 50);
    expect(s.expectancyR).toBeCloseTo((2 - 1 + 1 - 1) / 4);
    expect(s.avgRWin).toBe(1.5);
    expect(s.avgRLoss).toBe(-1);
    expect(s.noStop).toBe(1);
    expect(s.best?.m.pnl).toBe(40);
    expect(s.worst?.m.pnl).toBe(-20);
    expect(s.planPct).toBe(80);
    expect(s.pnlNotFollowed).toBe(-20);
  });
  it("rachas", () => {
    expect(s.maxLossStreak).toBe(2);
    expect(streaks([1, 1, 1, 0, 1, -1])).toEqual({ maxWin: 3, maxLoss: 1 });
  });
  it("PnL por día, semana y sobreoperación", () => {
    const days = dailyStats(list);
    expect(days.map((d) => d.pnl)).toEqual([20, 20, -30]);
    expect(sumBy(days, weekStart)).toEqual([{ key: "2026-10-05", pnl: 10, count: 5, days: 3 }]);
    expect(byTradesPerDay(days)).toEqual([
      { trades: 1, days: 1, totalPnl: 20, avgPnl: 20 },
      { trades: 2, days: 2, totalPnl: -10, avgPnl: -5 },
    ]);
  });
  it("equity y drawdown", () => {
    const { points, maxDrawdown } = equityCurve(list);
    expect(points.at(-1)?.equity).toBe(10);
    expect(maxDrawdown).toBe(-30);
  });
  it("sin trades no rompe", () => {
    const e = summarize([]);
    expect(e.winrate).toBeNull();
    expect(e.profitFactor).toBeNull();
    expect(equityCurve([]).maxDrawdown).toBe(0);
  });
  it("weekStart usa lunes", () => {
    expect(weekStart("2026-10-11")).toBe("2026-10-05");
    expect(weekStart("2026-10-05")).toBe("2026-10-05");
  });
});

describe("calculadora y tabla de riesgo", () => {
  it("contratos = riesgo / (puntos × valor)", () => {
    expect(positionSize(200, 25, 2)).toBe(4);
    expect(positionSize(100, 30, 2)).toBe(1);
    expect(positionSize(100, 0, 2)).toBe(0);
  });
  it("pérdidas hasta DLL / MLL", () => {
    expect(lossesToLimit(1200, 200)).toBe(6);
    expect(lossesToLimit(2000, 300)).toBe(6);
    expect(lossesToLimit(null, 200)).toBeNull();
  });
});

describe("MLL EOD", () => {
  const rules = { ...LUCID_50K_FLEX_EOD }; // MLL 2000 EOD
  // MNQ: 2 USD/punto. 1 contrato, entrada 100 → exit 100 + pnl/2.
  const day = (d: string, pnl: number, h = "10:00") => T({ entryAt: `${d}T${h}`, exitAt: null, stop: null, exit: 100 + pnl / 2 });
  it("piso inicial = tamaño − MLL", () => {
    const r = computeMll(50000, rules, []);
    expect(r.floor).toBe(48000);
    expect(r.distance).toBe(2000);
    expect(r.usedPct).toBe(0);
  });
  it("el piso sube con el cierre máximo y no baja", () => {
    const list = enrich([day("2026-10-05", 500), day("2026-10-06", 300), day("2026-10-07", -600)], [MNQ]);
    const r = computeMll(50000, rules, list);
    expect(r.days.map((d) => d.floor)).toEqual([48000, 48500, 48800]);
    expect(r.balance).toBe(50200);
    expect(r.floor).toBe(48800);
    expect(r.distance).toBe(1400);
    expect(r.usedPct).toBeCloseTo(30);
    expect(r.breached).toBe(false);
  });
  it("dentro del día el piso no se mueve (EOD) y detecta el toque", () => {
    const list = enrich([day("2026-10-05", 1000, "10:00"), day("2026-10-05", -2500, "11:00")], [MNQ]);
    const r = computeMll(50000, rules, list);
    // Intradía el pico sería 51000 → piso 49000; con EOD sigue en 48000 y el balance 48500 no lo toca.
    expect(r.breached).toBe(false);
    expect(r.floor).toBe(48000); // cierre 48500 < pico 50000
    const intr = computeMll(50000, { ...rules, drawdownType: "intradia" }, list);
    expect(intr.breached).toBe(true);
  });
  it("toque del MLL", () => {
    const r = computeMll(50000, rules, enrich([day("2026-10-05", -2000)], [MNQ]));
    expect(r.breached).toBe(true);
    expect(r.breachedOn).toBe("2026-10-05");
  });
  it("piso congelado (lock)", () => {
    const list = enrich([day("2026-10-05", 3000), day("2026-10-06", 1000)], [MNQ]);
    const r = computeMll(50000, { ...rules, mllLockAt: 50000 }, list);
    expect(r.floor).toBe(50000);
  });
  it("estático", () => {
    const r = computeMll(50000, { ...rules, drawdownType: "estatico" }, enrich([day("2026-10-05", 3000)], [MNQ]));
    expect(r.floor).toBe(48000);
  });
});

describe("DLL, retiro y límites personales", () => {
  it("DLL con día perdedor y ganador", () => {
    expect(computeDll(-600, 1200)).toMatchObject({ remaining: 600, usedPct: 50, breached: false });
    expect(computeDll(-1300, 1200).breached).toBe(true);
    expect(computeDll(400, 1200)).toMatchObject({ remaining: 1200, usedPct: 0 });
    expect(computeDll(-100, null).limit).toBeNull();
  });
  it("alertas por umbral", () => {
    const l = { warnPct: 50, dangerPct: 80 };
    expect(alertLevel(10, l)).toBe("ok");
    expect(alertLevel(50, l)).toBe("warn");
    expect(alertLevel(85, l)).toBe("danger");
  });
  it("días de retiro ≥ mínimo", () => {
    const days = [150, 149, 300, -50].map((pnl, i) => ({ day: `d${i}`, pnl, count: 1, wins: 0, r: 0, maxContracts: 1 }));
    expect(payoutDays(days, 150).length).toBe(2);
  });
  it("avisos personales", () => {
    const w = personalWarnings(
      { day: "x", pnl: -300, count: 4, wins: 0, r: -3, maxContracts: 5 },
      { maxTradesPerDay: 3, maxDailyLossUsd: 300, maxDailyLossR: 2, maxContracts: 4, warnPct: 50, dangerPct: 80 },
    );
    expect(w.length).toBe(4);
  });
});
