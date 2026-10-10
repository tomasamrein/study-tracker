import { describe, expect, it } from "vitest";
import { aggregate, bucketStart, parseCandleCsv, type Candle } from "./candles";
import { ema, fvgZones, DEFAULT_FVG, dailyLevels } from "./indicators";
import { emptySim, marketOrder, placePending, sizeForRisk, step } from "./sim";
import { fromLocalString, toLocalString, tradingDay, NY } from "./time";

const c = (time: number, o: number, h: number, l: number, cl: number): Candle => ({ time, open: o, high: h, low: l, close: cl, volume: 1 });

// 2026-09-15 13:30 UTC = 09:30 NY (EDT)
const T0 = Date.UTC(2026, 8, 15, 13, 30) / 1000;

describe("time", () => {
  it("convierte hora de NY ida y vuelta", () => {
    expect(fromLocalString(NY, "2026-09-15T09:30")).toBe(T0);
    expect(toLocalString(NY, T0)).toBe("2026-09-15T09:30");
  });
  it("el día de trading arranca a las 18:00 NY", () => {
    const t1759 = fromLocalString(NY, "2026-09-15T17:59");
    const t1800 = fromLocalString(NY, "2026-09-15T18:00");
    expect(tradingDay(t1759)).toBe("2026-09-15");
    expect(tradingDay(t1800)).toBe("2026-09-16");
  });
});

describe("aggregate", () => {
  it("arma velas de 5m con OHLC correcto", () => {
    const m1 = [0, 1, 2, 3, 4, 5].map((i) => c(T0 + i * 60, 100 + i, 101 + i, 99 + i, 100.5 + i));
    const b = aggregate(m1, 5);
    expect(b).toHaveLength(2);
    expect(b[0]).toMatchObject({ time: T0, open: 100, high: 105, low: 99, close: 104.5 });
    expect(b[1].time).toBe(T0 + 300);
  });
  it("4H alineado a 18:00 NY", () => {
    const t = fromLocalString(NY, "2026-09-15T09:47");
    expect(toLocalString(NY, bucketStart(t, 240))).toBe("2026-09-15T06:00");
  });
  it("parsea CSV de TradingView", () => {
    const csv = "time,open,high,low,close,Volume\n1789738200,1,2,0.5,1.5,10\n1789738260,1.5,3,1,2,5";
    expect(parseCandleCsv(csv)).toHaveLength(2);
  });
});

describe("indicadores", () => {
  it("EMA arranca con la SMA", () => {
    const bars = [1, 2, 3, 4].map((v, i) => c(T0 + i * 60, v, v, v, v));
    const e = ema(bars, 3);
    expect(e[0].value).toBeCloseTo(2);
    expect(e[1].value).toBeCloseTo(3);
  });
  it("detecta FVG alcista y su inversión", () => {
    const bars = [
      c(T0, 100, 101, 99, 100.5),
      c(T0 + 60, 101, 108, 100.8, 107),
      c(T0 + 120, 107, 110, 104, 109), // low 104 > high 101 → FVG 101–104
      c(T0 + 180, 109, 109, 98, 99), // cierra < 101 → iFVG bajista
    ];
    const z = fvgZones(bars, { ...DEFAULT_FVG, minSize: 1, showDead: true });
    expect(z.find((x) => x.kind === "fvg-bull")).toMatchObject({ top: 104, bottom: 101, to: T0 + 180 });
    expect(z.find((x) => x.kind === "ifvg-bear")).toMatchObject({ from: T0 + 180, to: null });
  });
  it("PDH/PDL del día anterior", () => {
    const d1 = fromLocalString(NY, "2026-09-14T10:00");
    const d2 = fromLocalString(NY, "2026-09-15T10:00");
    const lv = dailyLevels([c(d1, 10, 20, 5, 15), c(d2, 15, 16, 14, 15)], { pdhl: true, midnight: false });
    expect(lv.map((l) => l.price)).toEqual([20, 5]);
  });
});

describe("simulador", () => {
  it("long a mercado toca el TP", () => {
    let s = marketOrder(emptySim(), "long", 2, 100, T0, 95, 110);
    s = step(s, c(T0 + 60, 100, 104, 99, 103));
    expect(s.position).not.toBeNull();
    s = step(s, c(T0 + 120, 103, 111, 102, 110));
    expect(s.position).toBeNull();
    expect(s.closed[0]).toMatchObject({ reason: "tp", exit: 110, points: 10, qty: 2 });
  });
  it("si toca stop y objetivo en la misma vela, toma el stop", () => {
    let s = marketOrder(emptySim(), "short", 1, 100, T0, 105, 90);
    s = step(s, c(T0 + 60, 100, 106, 89, 95));
    expect(s.closed[0]).toMatchObject({ reason: "sl", exit: 105, points: -5 });
  });
  it("limit de compra se llena al tocar", () => {
    let s = placePending(emptySim(), { side: "long", type: "limit", price: 98, qty: 1, sl: 95, tp: 104, createdAt: T0 });
    s = step(s, c(T0 + 60, 100, 101, 99, 100));
    expect(s.position).toBeNull();
    s = step(s, c(T0 + 120, 100, 100, 97, 99));
    expect(s.position).toMatchObject({ entry: 98, side: "long" });
  });
  it("tamaño por riesgo", () => {
    expect(sizeForRisk(200, 10, 2)).toBe(10);
    expect(sizeForRisk(200, 10, 20)).toBe(1);
  });
});
