/**
 * Cálculos puros de trading: métricas por trade, estadísticas agregadas,
 * curva de equity y drawdown. Sin dependencias de React ni de storage.
 *
 * Convención de fechas: `entryAt`/`exitAt` se guardan como hora local de la
 * zona configurada, en formato "yyyy-MM-ddTHH:mm". El día de un trade es
 * `entryAt.slice(0, 10)`.
 */
import type { Instrument, Trade } from "./types";

export interface TradeMetrics {
  /** Puntos a favor (+) o en contra (−). */
  points: number;
  grossPnl: number;
  commission: number;
  /** PnL neto (después de comisiones). */
  pnl: number;
  /** Puntos de riesgo hasta el stop inicial (null = sin stop o stop inválido). */
  riskPoints: number | null;
  riskUsd: number | null;
  /** Resultado en R = PnL neto / riesgo inicial. null si no hay stop. */
  r: number | null;
  /** R planeado hasta el objetivo. */
  plannedR: number | null;
  durationMin: number | null;
}

const sign = (t: Pick<Trade, "direction">) => (t.direction === "long" ? 1 : -1);

/** Minutos entre dos fechas "yyyy-MM-ddTHH:mm" (misma zona). */
export function minutesBetween(a: string, b: string): number | null {
  const ta = Date.parse(`${a.slice(0, 16)}:00Z`);
  const tb = Date.parse(`${b.slice(0, 16)}:00Z`);
  if (Number.isNaN(ta) || Number.isNaN(tb)) return null;
  return Math.round((tb - ta) / 60000);
}

export function tradeMetrics(
  t: Trade,
  instrument: Pick<Instrument, "pointValue" | "commission"> | undefined,
): TradeMetrics {
  const pv = instrument?.pointValue ?? 0;
  const d = sign(t);
  const points = (t.exit - t.entry) * d;
  const grossPnl = points * pv * t.contracts;
  const commission = t.commission ?? (instrument?.commission ?? 0) * t.contracts;
  const pnl = grossPnl - commission;
  const rp = t.stop != null ? (t.entry - t.stop) * d : null;
  const riskPoints = rp != null && rp > 0 ? rp : null;
  const riskUsd = riskPoints != null ? riskPoints * pv * t.contracts : null;
  const r = riskUsd ? pnl / riskUsd : null;
  const tp = t.target != null ? (t.target - t.entry) * d : null;
  const plannedR = riskPoints && tp != null && tp > 0 ? tp / riskPoints : null;
  const durationMin = t.exitAt ? minutesBetween(t.entryAt, t.exitAt) : null;
  return { points, grossPnl, commission, pnl, riskPoints, riskUsd, r, plannedR, durationMin };
}

/** Errores de validación del formulario (vacío = válido). */
export function validateTrade(t: Partial<Trade>): Record<string, string> {
  const e: Record<string, string> = {};
  const num = (v: unknown) => typeof v === "number" && Number.isFinite(v);
  if (!t.accountId) e.accountId = "Elegí una cuenta.";
  if (!t.instrumentId) e.instrumentId = "Elegí un instrumento.";
  if (!t.entryAt) e.entryAt = "Falta la fecha de entrada.";
  if (!num(t.entry)) e.entry = "Precio de entrada inválido.";
  if (!num(t.exit)) e.exit = "Precio de salida inválido.";
  if (!num(t.contracts) || (t.contracts as number) <= 0 || !Number.isInteger(t.contracts))
    e.contracts = "Los contratos tienen que ser un entero positivo.";
  if (num(t.entry) && t.stop != null) {
    if (!num(t.stop)) e.stop = "Stop inválido.";
    else if (t.direction === "long" && (t.stop as number) >= (t.entry as number))
      e.stop = "En un Long el stop va por debajo de la entrada.";
    else if (t.direction === "short" && (t.stop as number) <= (t.entry as number))
      e.stop = "En un Short el stop va por encima de la entrada.";
  }
  if (num(t.entry) && t.target != null) {
    if (!num(t.target)) e.target = "Objetivo inválido.";
    else if (t.direction === "long" && (t.target as number) <= (t.entry as number))
      e.target = "En un Long el objetivo va por encima de la entrada.";
    else if (t.direction === "short" && (t.target as number) >= (t.entry as number))
      e.target = "En un Short el objetivo va por debajo de la entrada.";
  }
  if (t.entryAt && t.exitAt) {
    const m = minutesBetween(t.entryAt, t.exitAt);
    if (m != null && m < 0) e.exitAt = "La salida no puede ser antes que la entrada.";
  }
  return e;
}

/** Trade con sus métricas calculadas. */
export interface Enriched {
  trade: Trade;
  m: TradeMetrics;
  day: string;
}

export function enrich(trades: Trade[], instruments: Instrument[]): Enriched[] {
  const byId = new Map(instruments.map((i) => [i.id, i]));
  return trades
    .map((trade) => ({ trade, m: tradeMetrics(trade, byId.get(trade.instrumentId)), day: trade.entryAt.slice(0, 10) }))
    .sort((a, b) => a.trade.entryAt.localeCompare(b.trade.entryAt));
}

export interface Summary {
  count: number;
  wins: number;
  losses: number;
  breakeven: number;
  /** 0–100 */
  winrate: number | null;
  totalPnl: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number | null;
  avgWin: number | null;
  avgLoss: number | null;
  avgRWin: number | null;
  avgRLoss: number | null;
  /** Expectativa por trade en R (solo trades con stop). */
  expectancyR: number | null;
  expectancyUsd: number | null;
  /** Trades sin stop (no entran en las métricas en R). */
  noStop: number;
  best: Enriched | null;
  worst: Enriched | null;
  maxWinStreak: number;
  maxLossStreak: number;
  /** 0–100 */
  planPct: number | null;
  pnlFollowed: number;
  pnlNotFollowed: number;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** Rachas máximas (un trade en 0 corta ambas rachas). Espera orden cronológico. */
export function streaks(pnls: number[]): { maxWin: number; maxLoss: number } {
  let w = 0, l = 0, maxWin = 0, maxLoss = 0;
  for (const p of pnls) {
    if (p > 0) { w++; l = 0; } else if (p < 0) { l++; w = 0; } else { w = 0; l = 0; }
    maxWin = Math.max(maxWin, w);
    maxLoss = Math.max(maxLoss, l);
  }
  return { maxWin, maxLoss };
}

export function summarize(list: Enriched[]): Summary {
  const wins = list.filter((x) => x.m.pnl > 0);
  const losses = list.filter((x) => x.m.pnl < 0);
  const grossProfit = wins.reduce((s, x) => s + x.m.pnl, 0);
  const grossLoss = losses.reduce((s, x) => s + x.m.pnl, 0);
  const withR = list.filter((x) => x.m.r != null);
  const rs = withR.map((x) => x.m.r as number);
  const { maxWin, maxLoss } = streaks(list.map((x) => x.m.pnl));
  const followed = list.filter((x) => x.trade.followedPlan);
  let best: Enriched | null = null, worst: Enriched | null = null;
  for (const x of list) {
    if (!best || x.m.pnl > best.m.pnl) best = x;
    if (!worst || x.m.pnl < worst.m.pnl) worst = x;
  }
  return {
    count: list.length,
    wins: wins.length,
    losses: losses.length,
    breakeven: list.length - wins.length - losses.length,
    winrate: list.length ? (wins.length / list.length) * 100 : null,
    totalPnl: grossProfit + grossLoss,
    grossProfit,
    grossLoss,
    profitFactor: grossLoss < 0 ? grossProfit / -grossLoss : null,
    avgWin: mean(wins.map((x) => x.m.pnl)),
    avgLoss: mean(losses.map((x) => x.m.pnl)),
    avgRWin: mean(rs.filter((r) => r > 0)),
    avgRLoss: mean(rs.filter((r) => r < 0)),
    expectancyR: mean(rs),
    expectancyUsd: mean(list.map((x) => x.m.pnl)),
    noStop: list.length - withR.length,
    best,
    worst,
    maxWinStreak: maxWin,
    maxLossStreak: maxLoss,
    planPct: list.length ? (followed.length / list.length) * 100 : null,
    pnlFollowed: followed.reduce((s, x) => s + x.m.pnl, 0),
    pnlNotFollowed: list.filter((x) => !x.trade.followedPlan).reduce((s, x) => s + x.m.pnl, 0),
  };
}

export interface DayStat {
  day: string;
  pnl: number;
  count: number;
  wins: number;
  r: number;
  maxContracts: number;
}

/** PnL por día, ordenado por fecha. */
export function dailyStats(list: Enriched[]): DayStat[] {
  const map = new Map<string, DayStat>();
  for (const x of list) {
    const d = map.get(x.day) ?? { day: x.day, pnl: 0, count: 0, wins: 0, r: 0, maxContracts: 0 };
    d.pnl += x.m.pnl;
    d.count++;
    if (x.m.pnl > 0) d.wins++;
    d.r += x.m.r ?? 0;
    d.maxContracts = Math.max(d.maxContracts, x.trade.contracts);
    map.set(x.day, d);
  }
  return [...map.values()].sort((a, b) => a.day.localeCompare(b.day));
}

/** Lunes (yyyy-MM-dd) de la semana de un día. */
export function weekStart(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

export const monthKey = (day: string) => day.slice(0, 7);

/** Suma el PnL de los días agrupado por una clave (semana, mes…). */
export function sumBy(days: DayStat[], key: (day: string) => string): { key: string; pnl: number; count: number; days: number }[] {
  const map = new Map<string, { key: string; pnl: number; count: number; days: number }>();
  for (const d of days) {
    const k = key(d.day);
    const g = map.get(k) ?? { key: k, pnl: 0, count: 0, days: 0 };
    g.pnl += d.pnl;
    g.count += d.count;
    g.days++;
    map.set(k, g);
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export interface EquityPoint {
  i: number;
  day: string;
  equity: number;
  /** Drawdown desde el pico (≤ 0). */
  drawdown: number;
}

/** Curva de equity acumulada por trade y drawdown desde el máximo. */
export function equityCurve(list: Enriched[], start = 0): { points: EquityPoint[]; maxDrawdown: number } {
  let eq = start, peak = start, maxDrawdown = 0;
  const points: EquityPoint[] = [{ i: 0, day: list[0]?.day ?? "", equity: start, drawdown: 0 }];
  list.forEach((x, idx) => {
    eq += x.m.pnl;
    peak = Math.max(peak, eq);
    const dd = eq - peak;
    maxDrawdown = Math.min(maxDrawdown, dd);
    points.push({ i: idx + 1, day: x.day, equity: eq, drawdown: dd });
  });
  return { points, maxDrawdown };
}

/** Agrupa trades y resume cada grupo. */
export function groupSummary(list: Enriched[], key: (x: Enriched) => string): { key: string; s: Summary }[] {
  const map = new Map<string, Enriched[]>();
  for (const x of list) {
    const k = key(x);
    map.set(k, [...(map.get(k) ?? []), x]);
  }
  return [...map.entries()].map(([k, l]) => ({ key: k, s: summarize(l) })).sort((a, b) => b.s.totalPnl - a.s.totalPnl);
}

/** Rendimiento de los días según cuántos trades se hicieron (sobreoperación). */
export function byTradesPerDay(days: DayStat[]): { trades: number; days: number; avgPnl: number; totalPnl: number }[] {
  const map = new Map<number, DayStat[]>();
  for (const d of days) map.set(d.count, [...(map.get(d.count) ?? []), d]);
  return [...map.entries()]
    .map(([n, ds]) => {
      const total = ds.reduce((s, d) => s + d.pnl, 0);
      return { trades: n, days: ds.length, totalPnl: total, avgPnl: total / ds.length };
    })
    .sort((a, b) => a.trades - b.trades);
}

const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
export const weekdayName = (day: string) => WEEKDAYS[new Date(`${day}T00:00:00Z`).getUTCDay()];

/** Contratos = riesgo ÷ (puntos de stop × valor por punto), redondeado hacia abajo. */
export function positionSize(riskUsd: number, stopPoints: number, pointValue: number): number {
  if (!(riskUsd > 0) || !(stopPoints > 0) || !(pointValue > 0)) return 0;
  return Math.floor(riskUsd / (stopPoints * pointValue) + 1e-9);
}

/** Pérdidas seguidas (de `riskPerTrade`) hasta consumir `limit`. */
export function lossesToLimit(limit: number | null, riskPerTrade: number): number | null {
  if (limit == null || !(riskPerTrade > 0)) return null;
  return Math.floor(limit / riskPerTrade + 1e-9);
}
