import { format as fmt } from "date-fns";

export function money(n: number | null | undefined, currency = "USD", signed = false): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const s = new Intl.NumberFormat("es-AR", { style: "currency", currency, maximumFractionDigits: 2 }).format(n);
  return signed && n > 0 ? `+${s}` : s;
}

export function rMult(r: number | null | undefined): string {
  if (r == null || !Number.isFinite(r)) return "—";
  return `${r > 0 ? "+" : ""}${r.toFixed(2)}R`;
}

export function pct(n: number | null | undefined, digits = 0): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toFixed(digits)}%`;
}

export function num(n: number | null | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toFixed(digits);
}

/** Formatea "yyyy-MM-dd" según el formato elegido en ajustes. */
export function day(d: string, pattern = "dd/MM/yyyy"): string {
  if (!d) return "";
  try {
    return fmt(new Date(`${d.slice(0, 10)}T12:00:00`), pattern);
  } catch {
    return d;
  }
}

export function duration(min: number | null | undefined): string {
  if (min == null) return "—";
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} min`;
}

/** "Ahora" en la zona horaria dada, como "yyyy-MM-ddTHH:mm". */
export function nowInTz(timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date());
    const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
    return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}`;
  } catch {
    return fmt(new Date(), "yyyy-MM-dd'T'HH:mm");
  }
}

export const todayInTz = (tz: string) => nowInTz(tz).slice(0, 10);

/** Color de texto para un PnL. */
export const pnlClass = (n: number) => (n > 0 ? "text-emerald-500" : n < 0 ? "text-red-500" : "text-muted-foreground");
