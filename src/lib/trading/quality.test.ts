import { describe, expect, it } from "vitest";
import { tradeMetrics } from "./calc";
import { qualityBreakdown, qualityScore } from "./quality";
import type { Trade } from "./types";

const MNQ = { pointValue: 2, commission: 0 };
const base: Trade = {
  id: "t", accountId: "a", modeId: "eval", instrumentId: "mnq", direction: "long", entryAt: "2026-10-08T09:57",
  entry: 31203, stop: 31173, target: 31247.25, exit: 31247.25, contracts: 5, followedPlan: true,
  setupId: "s", sessionId: "ny", notes: "ok", createdAt: "",
};

describe("qualityScore", () => {
  it("trade de la tarjeta de ejemplo: R 1,48 y $442,50", () => {
    const m = tradeMetrics(base, MNQ);
    expect(m.pnl).toBeCloseTo(442.5);
    expect(m.r).toBeCloseTo(1.475);
    expect(qualityScore({ trade: base, m, sizeViolation: false, preChecklist: 1 })).toBe(95); // R planeado 1,475 → 5 de 10
  });
  it("proceso perfecto aunque pierda", () => {
    const t = { ...base, target: 31263, exit: 31173 };
    expect(qualityScore({ trade: t, m: tradeMetrics(t, MNQ), sizeViolation: false, preChecklist: 1 })).toBe(100);
  });
  it("fuera de plan, sin stop y sobredimensionado", () => {
    const t = { ...base, followedPlan: false, stop: null, target: null, setupId: null, sessionId: null, notes: "" };
    const parts = qualityBreakdown({ trade: t, m: tradeMetrics(t, MNQ), sizeViolation: true, preChecklist: null });
    expect(parts.reduce((s, p) => s + p.points, 0)).toBe(0);
  });
  it("checklist parcial suma proporcional", () => {
    const m = tradeMetrics(base, MNQ);
    expect(qualityScore({ trade: base, m, sizeViolation: false, preChecklist: 0.5 })).toBe(88);
  });
});
