import type { Candle } from "./candles";
import { NY, localMinuteOfDay, tradingDay } from "./time";

export interface LinePoint {
  time: number;
  value: number;
}

export function ema(bars: Candle[], length: number, src: "close" | "open" | "high" | "low" = "close"): LinePoint[] {
  const out: LinePoint[] = [];
  if (length < 1) return out;
  const k = 2 / (length + 1);
  let prev: number | null = null;
  let sum = 0;
  for (let i = 0; i < bars.length; i++) {
    const v = bars[i][src];
    if (prev === null) {
      sum += v;
      if (i === length - 1) {
        prev = sum / length;
        out.push({ time: bars[i].time, value: prev });
      }
      continue;
    }
    prev = v * k + prev * (1 - k);
    out.push({ time: bars[i].time, value: prev });
  }
  return out;
}

export function sma(bars: Candle[], length: number, src: "close" | "open" | "high" | "low" = "close"): LinePoint[] {
  const out: LinePoint[] = [];
  if (length < 1) return out;
  let sum = 0;
  for (let i = 0; i < bars.length; i++) {
    sum += bars[i][src];
    if (i >= length) sum -= bars[i - length][src];
    if (i >= length - 1) out.push({ time: bars[i].time, value: sum / length });
  }
  return out;
}

/** VWAP que se reinicia en cada día de trading de futuros (18:00 NY). */
export function vwap(bars: Candle[]): LinePoint[] {
  const out: LinePoint[] = [];
  let day = "";
  let pv = 0;
  let vol = 0;
  for (const b of bars) {
    const d = tradingDay(b.time);
    if (d !== day) {
      day = d;
      pv = 0;
      vol = 0;
    }
    const tp = (b.high + b.low + b.close) / 3;
    const v = b.volume > 0 ? b.volume : 1;
    pv += tp * v;
    vol += v;
    out.push({ time: b.time, value: pv / vol });
  }
  return out;
}

export interface Zone {
  id: string;
  /** Vela donde empieza la zona. */
  from: number;
  /** Vela donde termina (null = sigue viva, se extiende a la derecha). */
  to: number | null;
  top: number;
  bottom: number;
  kind: "fvg-bull" | "fvg-bear" | "ifvg-bull" | "ifvg-bear" | "session" | "user";
  label?: string;
}

export interface FvgOptions {
  /** Tamaño mínimo del gap en puntos. */
  minSize: number;
  showFvg: boolean;
  showIfvg: boolean;
  /** Cuántas zonas vivas mostrar como máximo (las más recientes). */
  maxZones: number;
  /** Mostrar también las ya invalidadas (cortadas donde murieron). */
  showDead: boolean;
}

export const DEFAULT_FVG: FvgOptions = { minSize: 4, showFvg: true, showIfvg: true, maxZones: 6, showDead: false };

/**
 * Fair Value Gaps e Inversion FVGs.
 * - FVG alcista en la vela i: low[i] > high[i-2]. Bajista: high[i] < low[i-2].
 * - Un FVG alcista se invierte (iFVG bajista) cuando una vela CIERRA por debajo
 *   de su base; uno bajista se invierte (iFVG alcista) al cerrar por encima del techo.
 * - Un iFVG muere cuando una vela cierra del otro lado (vuelve a atravesarlo).
 */
export function fvgZones(bars: Candle[], opt: FvgOptions): Zone[] {
  interface Live extends Zone {
    dead: boolean;
  }
  const all: Live[] = [];
  const live: Live[] = [];
  for (let i = 2; i < bars.length; i++) {
    const b = bars[i];
    // 1) Actualizar zonas vivas con el cierre de esta vela.
    for (let j = live.length - 1; j >= 0; j--) {
      const z = live[j];
      let killed = false;
      if (z.kind === "fvg-bull" && b.close < z.bottom) {
        z.to = b.time;
        z.dead = true;
        killed = true;
        const inv: Live = { id: `${z.id}-i`, from: b.time, to: null, top: z.top, bottom: z.bottom, kind: "ifvg-bear", dead: false };
        all.push(inv);
        live.push(inv);
      } else if (z.kind === "fvg-bear" && b.close > z.top) {
        z.to = b.time;
        z.dead = true;
        killed = true;
        const inv: Live = { id: `${z.id}-i`, from: b.time, to: null, top: z.top, bottom: z.bottom, kind: "ifvg-bull", dead: false };
        all.push(inv);
        live.push(inv);
      } else if (z.kind === "ifvg-bear" && b.close > z.top) {
        z.to = b.time;
        z.dead = true;
        killed = true;
      } else if (z.kind === "ifvg-bull" && b.close < z.bottom) {
        z.to = b.time;
        z.dead = true;
        killed = true;
      }
      if (killed) live.splice(j, 1);
    }
    // 2) Detectar FVG nuevo formado con esta vela.
    const a = bars[i - 2];
    if (b.low > a.high && b.low - a.high >= opt.minSize) {
      const z: Live = { id: `f${a.time}`, from: a.time, to: null, top: b.low, bottom: a.high, kind: "fvg-bull", dead: false };
      all.push(z);
      live.push(z);
    } else if (b.high < a.low && a.low - b.high >= opt.minSize) {
      const z: Live = { id: `f${a.time}`, from: a.time, to: null, top: a.low, bottom: b.high, kind: "fvg-bear", dead: false };
      all.push(z);
      live.push(z);
    }
  }
  const wanted = all.filter((z) => {
    const isInv = z.kind.startsWith("ifvg");
    if (isInv ? !opt.showIfvg : !opt.showFvg) return false;
    return opt.showDead || !z.dead;
  });
  // Las vivas más recientes primero hasta el máximo.
  const liveOnes = wanted.filter((z) => !z.dead).slice(-opt.maxZones);
  const deadOnes = wanted.filter((z) => z.dead).slice(-opt.maxZones);
  return [...deadOnes, ...liveOnes].map((z) => ({ id: z.id, from: z.from, to: z.to, top: z.top, bottom: z.bottom, kind: z.kind }));
}

export interface SessionDef {
  id: string;
  name: string;
  /** "HH:mm" hora de Nueva York. */
  start: string;
  end: string;
  color: string;
  enabled: boolean;
}

export const DEFAULT_SESSIONS: SessionDef[] = [
  { id: "asia", name: "Asia", start: "20:00", end: "00:00", color: "#a855f7", enabled: true },
  { id: "london", name: "Londres", start: "02:00", end: "05:00", color: "#3b82f6", enabled: true },
  { id: "nyam", name: "NY AM", start: "09:30", end: "11:00", color: "#f59e0b", enabled: true },
  { id: "nypm", name: "NY PM", start: "13:30", end: "16:00", color: "#10b981", enabled: false },
];

const hm = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** ¿La vela (por su hora de NY) cae dentro de la sesión? */
export function inSession(t: number, s: SessionDef): boolean {
  const m = localMinuteOfDay(NY, t);
  const a = hm(s.start);
  const b = hm(s.end);
  return a <= b ? m >= a && m < b : m >= a || m < b;
}

/** Cajas de rango (máximo/mínimo) de cada sesión habilitada. */
export function sessionZones(bars: Candle[], sessions: SessionDef[]): (Zone & { color: string })[] {
  const out: (Zone & { color: string })[] = [];
  for (const s of sessions) {
    if (!s.enabled) continue;
    let cur: (Zone & { color: string }) | null = null;
    let last = 0;
    for (const b of bars) {
      if (inSession(b.time, s)) {
        if (!cur || b.time - last > 3 * 3600) {
          cur = { id: `${s.id}-${b.time}`, from: b.time, to: b.time, top: b.high, bottom: b.low, kind: "session", label: s.name, color: s.color };
          out.push(cur);
        } else {
          cur.to = b.time;
          cur.top = Math.max(cur.top, b.high);
          cur.bottom = Math.min(cur.bottom, b.low);
        }
        last = b.time;
      } else if (cur) {
        cur = null;
      }
    }
  }
  return out;
}

export interface Level {
  id: string;
  price: number;
  from: number;
  label: string;
}

/**
 * Máximo y mínimo del día de trading anterior (PDH/PDL) y apertura de la
 * medianoche de NY (ICT), para el día actual.
 */
export function dailyLevels(bars: Candle[], opts: { pdhl: boolean; midnight: boolean }): Level[] {
  if (!bars.length) return [];
  const days = new Map<string, { high: number; low: number; first: number }>();
  const order: string[] = [];
  for (const b of bars) {
    const d = tradingDay(b.time);
    const e = days.get(d);
    if (!e) {
      days.set(d, { high: b.high, low: b.low, first: b.time });
      order.push(d);
    } else {
      e.high = Math.max(e.high, b.high);
      e.low = Math.min(e.low, b.low);
    }
  }
  const out: Level[] = [];
  const today = order[order.length - 1];
  const prev = order[order.length - 2];
  const t = days.get(today)!;
  if (opts.pdhl && prev) {
    const p = days.get(prev)!;
    out.push({ id: "pdh", price: p.high, from: t.first, label: "PDH" });
    out.push({ id: "pdl", price: p.low, from: t.first, label: "PDL" });
  }
  if (opts.midnight) {
    const mid = bars.find((b) => b.time >= t.first && localMinuteOfDay(NY, b.time) === 0);
    if (mid) out.push({ id: "mo", price: mid.open, from: mid.time, label: "00:00 Open" });
  }
  return out;
}
