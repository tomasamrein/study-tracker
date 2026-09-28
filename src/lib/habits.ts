import { differenceInCalendarDays, format, parseISO, subDays } from "date-fns";
import type { Vice } from "./types";

const DAY_KEY = "yyyy-MM-dd";

/** Racha actual de un hábito (cuenta desde hoy, o desde ayer si hoy falta marcar). */
export function habitStreak(
  habitLog: Record<string, string[]>,
  habitId: string,
  now: Date = new Date(),
): number {
  const has = (d: Date) => habitLog[format(d, DAY_KEY)]?.includes(habitId) ?? false;
  let cursor = has(now) ? now : subDays(now, 1);
  let n = 0;
  while (has(cursor)) {
    n++;
    cursor = subDays(cursor, 1);
  }
  return n;
}

/** Mejor racha histórica de un hábito. */
export function habitBestStreak(
  habitLog: Record<string, string[]>,
  habitId: string,
): number {
  const days = Object.keys(habitLog)
    .filter((k) => habitLog[k].includes(habitId))
    .sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const k of days) {
    const d = parseISO(k);
    run = prev && differenceInCalendarDays(d, prev) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

/** Cantidad de días en los últimos `n` en que se cumplió el hábito. */
export function habitDoneInLast(
  habitLog: Record<string, string[]>,
  habitId: string,
  n: number,
  now: Date = new Date(),
): number {
  let count = 0;
  for (let i = 0; i < n; i++) {
    if (habitLog[format(subDays(now, i), DAY_KEY)]?.includes(habitId)) count++;
  }
  return count;
}

/** Días completos limpio desde la última recaída. */
export function daysClean(vice: Vice, now: Date = new Date()): number {
  return Math.max(0, differenceInCalendarDays(now, parseISO(vice.since)));
}

/** Mejor racha limpia (histórica o la actual si es mayor). */
export function bestClean(vice: Vice, now: Date = new Date()): number {
  return Math.max(vice.best, daysClean(vice, now));
}

/** Días con al menos un hábito cumplido o ritual registrado. */
export function lastNDayKeys(n: number, now: Date = new Date()): string[] {
  return Array.from({ length: n }, (_, i) =>
    format(subDays(now, n - 1 - i), DAY_KEY),
  );
}
