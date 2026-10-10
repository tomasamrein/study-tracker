/**
 * Utilidades de tiempo para el replay. Todo se maneja en segundos UNIX (UTC);
 * las zonas horarias solo se usan para mostrar y para alinear velas a la
 * sesión de futuros (el día de CME arranca a las 18:00 de Nueva York).
 */

export const NY = "America/New_York";

const offsetCache = new Map<string, number>();

/** Minutos a sumar a UTC para obtener la hora local de `tz` en `t` (segundos). */
export function tzOffsetMin(tz: string, t: number): number {
  const hourKey = `${tz}|${Math.floor(t / 3600)}`;
  const cached = offsetCache.get(hourKey);
  if (cached !== undefined) return cached;
  let off = 0;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(new Date(t * 1000));
    const g = (k: string) => Number(parts.find((p) => p.type === k)?.value ?? 0);
    const asUtc = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour") % 24, g("minute"));
    off = Math.round((asUtc - Math.floor(t / 60) * 60_000) / 60_000);
  } catch {
    off = 0;
  }
  if (offsetCache.size > 20_000) offsetCache.clear();
  offsetCache.set(hourKey, off);
  return off;
}

/** Segundos "locales" (UTC desplazado) para mostrar en el gráfico. */
export const toLocal = (tz: string, t: number) => t + tzOffsetMin(tz, t) * 60;

/** Convierte "yyyy-MM-ddTHH:mm" en hora local de `tz` a segundos UTC. */
export function fromLocalString(tz: string, s: string): number {
  const guess = Math.floor(Date.parse(`${s.slice(0, 16)}:00Z`) / 1000);
  if (Number.isNaN(guess)) return NaN;
  // Dos pasadas para resolver bien los cambios de horario.
  let t = guess - tzOffsetMin(tz, guess) * 60;
  t = guess - tzOffsetMin(tz, t) * 60;
  return t;
}

/** "yyyy-MM-ddTHH:mm" en la zona dada. */
export function toLocalString(tz: string, t: number): string {
  const d = new Date(toLocal(tz, t) * 1000);
  return d.toISOString().slice(0, 16);
}

/** Minutos desde la medianoche local (0..1439). */
export function localMinuteOfDay(tz: string, t: number): number {
  const l = toLocal(tz, t);
  return Math.floor(((l % 86400) + 86400) % 86400 / 60);
}

/** Día de trading de futuros (yyyy-MM-dd): después de las 18:00 NY cuenta como el día siguiente. */
export function tradingDay(t: number): string {
  const l = toLocal(NY, t) + 6 * 3600; // 18:00 → 00:00 del día siguiente
  return new Date(l * 1000).toISOString().slice(0, 10);
}

/** yyyy-MM-dd UTC de un timestamp. */
export const utcDay = (t: number) => new Date(t * 1000).toISOString().slice(0, 10);

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
