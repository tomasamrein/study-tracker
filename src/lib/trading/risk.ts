/**
 * Reglas de riesgo de la prop firm (MLL / DLL) y límites personales.
 *
 * IMPORTANTE: esta es una interpretación configurable de las reglas. Verificar
 * contra las reglas oficiales de la firm.
 *
 *  - MLL "estatico": piso = balance inicial − MLL (no se mueve).
 *  - MLL "eod": al cierre de cada día, piso = (máximo balance de cierre
 *    alcanzado, incluyendo el inicial) − MLL. Durante el día el piso no se
 *    mueve. Si `mllLockAt` está definido, el piso nunca sube por encima de
 *    ese valor.
 *  - MLL "intradia": igual que EOD pero el máximo se toma después de cada
 *    trade cerrado (no hay datos de PnL flotante).
 *  - Se considera que la cuenta tocó el MLL si el balance queda ≤ al piso
 *    vigente en ese momento.
 *  - DLL: pérdida realizada del día (suma del PnL neto de los trades del día).
 */
import type { AccountRules, PersonalLimits } from "./types";
import type { DayStat, Enriched } from "./calc";

export interface MllDay {
  day: string;
  pnl: number;
  close: number;
  /** Piso vigente durante ese día. */
  floor: number;
  breached: boolean;
}

export interface MllResult {
  balance: number;
  /** Piso vigente ahora (para el próximo trade). */
  floor: number | null;
  /** Balance − piso. */
  distance: number | null;
  /** % del MLL consumido (0–100). */
  usedPct: number | null;
  breached: boolean;
  /** Primer día en que se tocó el piso. */
  breachedOn: string | null;
  days: MllDay[];
}

function capFloor(floor: number, rules: AccountRules) {
  return rules.mllLockAt != null ? Math.min(floor, rules.mllLockAt) : floor;
}

/**
 * Calcula el balance y el piso del MLL a partir de los trades de una cuenta
 * (ordenados cronológicamente) y su balance inicial.
 */
export function computeMll(size: number, rules: AccountRules, trades: Enriched[]): MllResult {
  const days: MllDay[] = [];
  let balance = size;
  let breachedOn: string | null = null;
  const maxLoss = rules.maxLoss;

  if (maxLoss == null) {
    for (const t of trades) balance += t.m.pnl;
    return { balance, floor: null, distance: null, usedPct: null, breached: false, breachedOn: null, days };
  }

  let peak = size;
  let floor = capFloor(size - maxLoss, rules);
  let i = 0;
  while (i < trades.length) {
    const day = trades[i].day;
    const dayFloor = floor;
    let dayPnl = 0;
    let breached = false;
    for (; i < trades.length && trades[i].day === day; i++) {
      balance += trades[i].m.pnl;
      dayPnl += trades[i].m.pnl;
      if (balance <= floor) breached = true;
      if (rules.drawdownType === "intradia") {
        peak = Math.max(peak, balance);
        floor = capFloor(peak - maxLoss, rules);
      }
    }
    if (rules.drawdownType === "eod") {
      peak = Math.max(peak, balance);
      floor = capFloor(peak - maxLoss, rules);
    }
    if (breached && !breachedOn) breachedOn = day;
    days.push({ day, pnl: dayPnl, close: balance, floor: dayFloor, breached });
  }
  const distance = balance - floor;
  return {
    balance,
    floor,
    distance,
    usedPct: Math.min(100, Math.max(0, (1 - distance / maxLoss) * 100)),
    breached: breachedOn != null,
    breachedOn,
    days,
  };
}

export interface DllResult {
  dayPnl: number;
  limit: number | null;
  /** Cuánto falta para tocar el DLL (null = sin regla). */
  remaining: number | null;
  usedPct: number | null;
  breached: boolean;
}

export function computeDll(dayPnl: number, limit: number | null): DllResult {
  if (limit == null || limit <= 0) return { dayPnl, limit: null, remaining: null, usedPct: null, breached: false };
  const lost = Math.max(0, -dayPnl);
  return {
    dayPnl,
    limit,
    remaining: limit - lost,
    usedPct: Math.min(100, (lost / limit) * 100),
    breached: lost >= limit,
  };
}

export type AlertLevel = "ok" | "warn" | "danger";

export function alertLevel(usedPct: number | null, limits: Pick<PersonalLimits, "warnPct" | "dangerPct">): AlertLevel {
  if (usedPct == null) return "ok";
  if (usedPct >= limits.dangerPct) return "danger";
  if (usedPct >= limits.warnPct) return "warn";
  return "ok";
}

/** Días que cuentan para el retiro (profit ≥ mínimo). */
export function payoutDays(days: DayStat[], min: number | null): DayStat[] {
  if (min == null) return [];
  return days.filter((d) => d.pnl >= min);
}

/** Consistencia: % del mejor día sobre la ganancia total (null si no aplica). */
export function consistency(days: DayStat[]): number | null {
  const total = days.reduce((s, d) => s + d.pnl, 0);
  if (total <= 0) return null;
  const best = Math.max(...days.map((d) => d.pnl));
  return (best / total) * 100;
}

/** Avisos de límites personales para un día. */
export function personalWarnings(day: DayStat | undefined, limits: PersonalLimits): string[] {
  if (!day) return [];
  const w: string[] = [];
  if (limits.maxTradesPerDay != null && day.count > limits.maxTradesPerDay)
    w.push(`Superaste tu máximo de ${limits.maxTradesPerDay} trades por día (${day.count}).`);
  else if (limits.maxTradesPerDay != null && day.count === limits.maxTradesPerDay)
    w.push(`Llegaste a tu máximo de ${limits.maxTradesPerDay} trades por día.`);
  if (limits.maxDailyLossUsd != null && -day.pnl >= limits.maxDailyLossUsd)
    w.push(`Llegaste a tu pérdida diaria máxima de ${limits.maxDailyLossUsd} USD.`);
  if (limits.maxDailyLossR != null && -day.r >= limits.maxDailyLossR)
    w.push(`Llegaste a tu pérdida diaria máxima de ${limits.maxDailyLossR} R.`);
  if (limits.maxContracts != null && day.maxContracts > limits.maxContracts)
    w.push(`Operaste ${day.maxContracts} contratos (tu máximo es ${limits.maxContracts}).`);
  return w;
}

/** Chequea el tamaño máximo de la cuenta. */
export function sizeViolation(contracts: number, micro: boolean, rules: AccountRules): string | null {
  const max = micro ? rules.maxMicros : rules.maxMinis;
  if (max != null && contracts > max) return `Supera el máximo de la cuenta (${max} ${micro ? "micros" : "minis"}).`;
  return null;
}
