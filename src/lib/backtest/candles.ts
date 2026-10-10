import { NY, toLocal, tradingDay } from "./time";

export interface Candle {
  /** Apertura de la vela, segundos UTC. */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Timeframe {
  id: string;
  label: string;
  /** Minutos por vela; 1440 = diario (sesión de futuros). */
  minutes: number;
}

export const TIMEFRAMES: Timeframe[] = [
  { id: "1m", label: "1m", minutes: 1 },
  { id: "2m", label: "2m", minutes: 2 },
  { id: "3m", label: "3m", minutes: 3 },
  { id: "5m", label: "5m", minutes: 5 },
  { id: "15m", label: "15m", minutes: 15 },
  { id: "30m", label: "30m", minutes: 30 },
  { id: "1h", label: "1H", minutes: 60 },
  { id: "4h", label: "4H", minutes: 240 },
  { id: "D", label: "D", minutes: 1440 },
];

export const tfById = (id: string) => TIMEFRAMES.find((t) => t.id === id) ?? TIMEFRAMES[0];

/**
 * Inicio del balde de una vela de 1m para el timeframe dado.
 * - Hasta 1H: alineado a múltiplos del epoch (los offsets de NY son horas enteras).
 * - 4H: alineado a la sesión de futuros (18:00, 22:00, 02:00… hora de NY), como TradingView.
 * - D: día de trading de futuros (18:00 → 17:00 NY).
 */
export function bucketStart(t: number, minutes: number): number {
  if (minutes <= 60) {
    const s = minutes * 60;
    return t - (((t % s) + s) % s);
  }
  // Minutos locales de NY desde las 18:00 del día anterior.
  const local = toLocal(NY, t);
  const shifted = local + 6 * 3600; // 18:00 local → 00:00
  const s = minutes >= 1440 ? 86400 : minutes * 60;
  const startShifted = shifted - (((shifted % s) + s) % s);
  return t - (shifted - startShifted);
}

/** Agrupa velas de 1m (ordenadas) en el timeframe pedido. La última puede quedar a medio formar. */
export function aggregate(m1: Candle[], minutes: number, end = m1.length): Candle[] {
  if (minutes <= 1) return m1.slice(0, end);
  const out: Candle[] = [];
  let cur: Candle | null = null;
  let curDay = "";
  for (let i = 0; i < end; i++) {
    const c = m1[i];
    let b: number;
    if (minutes >= 1440) {
      const day = tradingDay(c.time);
      if (cur && day === curDay) b = cur.time;
      else {
        curDay = day;
        b = c.time;
      }
    } else {
      b = bucketStart(c.time, minutes);
    }
    if (cur && cur.time === b) {
      if (c.high > cur.high) cur.high = c.high;
      if (c.low < cur.low) cur.low = c.low;
      cur.close = c.close;
      cur.volume += c.volume;
    } else {
      cur = { time: b, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume };
      out.push(cur);
    }
  }
  return out;
}

/** Índice de la última vela con `time <= t` (−1 si no hay). */
export function lastIndexAtOrBefore(list: { time: number }[], t: number): number {
  let lo = 0;
  let hi = list.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (list[mid].time <= t) {
      ans = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return ans;
}

/** Une listas de velas por tiempo, sin duplicados. */
export function mergeCandles(a: Candle[], b: Candle[]): Candle[] {
  const map = new Map<number, Candle>();
  for (const c of a) map.set(c.time, c);
  for (const c of b) map.set(c.time, c);
  return [...map.values()].sort((x, y) => x.time - y.time);
}

/** Parsea un CSV exportado de TradingView (time,open,high,low,close[,Volume]). */
export function parseCandleCsv(text: string): Candle[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const head = lines[0].toLowerCase().split(/[,;]/).map((h) => h.trim().replace(/"/g, ""));
  const idx = (names: string[]) => head.findIndex((h) => names.includes(h));
  const it = idx(["time", "date", "datetime", "timestamp", "fecha"]);
  const io = idx(["open", "apertura"]);
  const ih = idx(["high", "maximo", "máximo"]);
  const il = idx(["low", "minimo", "mínimo"]);
  const ic = idx(["close", "cierre"]);
  const iv = idx(["volume", "vol", "volumen"]);
  if ([it, io, ih, il, ic].some((x) => x < 0)) return [];
  const out: Candle[] = [];
  for (const line of lines.slice(1)) {
    const cols = line.split(/[,;]/).map((c) => c.trim().replace(/"/g, ""));
    const raw = cols[it];
    let t = Number(raw);
    if (!Number.isFinite(t)) t = Math.floor(Date.parse(raw) / 1000);
    else if (t > 1e12) t = Math.floor(t / 1000);
    const c = {
      time: t,
      open: Number(cols[io]),
      high: Number(cols[ih]),
      low: Number(cols[il]),
      close: Number(cols[ic]),
      volume: iv >= 0 ? Number(cols[iv]) || 0 : 0,
    };
    if ([c.time, c.open, c.high, c.low, c.close].every(Number.isFinite)) out.push(c);
  }
  return out.sort((a, b) => a.time - b.time);
}
