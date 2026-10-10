import type { Candle } from "./candles";

/**
 * Simulador de órdenes del replay. Trabaja sobre las velas base (1m) a medida
 * que avanzan, igual que un broker: las órdenes pendientes se llenan cuando el
 * precio las toca y el stop/objetivo se chequean con el máximo y mínimo.
 *
 * Supuestos (conservadores):
 *  - Si en la misma vela se tocan stop y objetivo, se toma el stop.
 *  - Si la vela abre más allá del stop (gap), se llena en la apertura.
 *  - Una orden pendiente que se llena en una vela no chequea stop/TP en esa
 *    misma vela salvo que la vela haya abierto ya más allá (no sabemos el orden
 *    intravela); el resto se evalúa desde la siguiente.
 */

export type Side = "long" | "short";
export type OrderType = "market" | "limit" | "stop";

export interface PendingOrder {
  id: string;
  side: Side;
  type: "limit" | "stop";
  price: number;
  qty: number;
  sl: number | null;
  tp: number | null;
  createdAt: number;
}

export interface Position {
  id: string;
  side: Side;
  qty: number;
  entry: number;
  entryAt: number;
  sl: number | null;
  tp: number | null;
  /** Stop con el que se abrió (para calcular R). */
  initialSl: number | null;
  /** Puntos de máxima excursión a favor y en contra (MFE / MAE). */
  mfe: number;
  mae: number;
}

export type ExitReason = "sl" | "tp" | "manual" | "be";

export interface ClosedTrade {
  id: string;
  side: Side;
  qty: number;
  entry: number;
  entryAt: number;
  exit: number;
  exitAt: number;
  sl: number | null;
  initialSl: number | null;
  tp: number | null;
  reason: ExitReason;
  points: number;
  mfe: number;
  mae: number;
}

export interface SimState {
  position: Position | null;
  pending: PendingOrder[];
  closed: ClosedTrade[];
}

export const emptySim = (): SimState => ({ position: null, pending: [], closed: [] });

const dir = (s: Side) => (s === "long" ? 1 : -1);

export const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export function validateBracket(side: Side, entry: number, sl: number | null, tp: number | null): string | null {
  if (sl != null && (side === "long" ? sl >= entry : sl <= entry)) return "El stop tiene que estar del lado contrario a la entrada.";
  if (tp != null && (side === "long" ? tp <= entry : tp >= entry)) return "El objetivo tiene que estar a favor de la entrada.";
  return null;
}

function close(state: SimState, price: number, at: number, reason: ExitReason): SimState {
  const p = state.position;
  if (!p) return state;
  const points = (price - p.entry) * dir(p.side);
  const be = reason === "sl" && p.sl != null && Math.abs(p.sl - p.entry) < 1e-9;
  const t: ClosedTrade = {
    id: p.id,
    side: p.side,
    qty: p.qty,
    entry: p.entry,
    entryAt: p.entryAt,
    exit: price,
    exitAt: at,
    sl: p.sl,
    initialSl: p.initialSl,
    tp: p.tp,
    reason: be ? "be" : reason,
    points,
    mfe: p.mfe,
    mae: p.mae,
  };
  return { ...state, position: null, closed: [...state.closed, t] };
}

/** Abre a mercado al precio actual (cierre de la última vela visible). */
export function marketOrder(state: SimState, side: Side, qty: number, price: number, at: number, sl: number | null, tp: number | null): SimState {
  if (state.position) {
    // Orden opuesta: cierra la posición (sin flips parciales para mantenerlo simple).
    if (state.position.side !== side) return close(state, price, at, "manual");
    // Misma dirección: promedia.
    const p = state.position;
    const total = p.qty + qty;
    const entry = (p.entry * p.qty + price * qty) / total;
    return { ...state, position: { ...p, qty: total, entry, sl: sl ?? p.sl, tp: tp ?? p.tp } };
  }
  return {
    ...state,
    position: { id: uid(), side, qty, entry: price, entryAt: at, sl, tp, initialSl: sl, mfe: 0, mae: 0 },
  };
}

export function placePending(state: SimState, o: Omit<PendingOrder, "id">): SimState {
  return { ...state, pending: [...state.pending, { ...o, id: uid() }] };
}

export function cancelPending(state: SimState, id: string): SimState {
  return { ...state, pending: state.pending.filter((o) => o.id !== id) };
}

export function closePosition(state: SimState, price: number, at: number): SimState {
  return close(state, price, at, "manual");
}

export function modifyPosition(state: SimState, patch: Partial<Pick<Position, "sl" | "tp">>): SimState {
  if (!state.position) return state;
  return { ...state, position: { ...state.position, ...patch } };
}

export function modifyPending(state: SimState, id: string, patch: Partial<Pick<PendingOrder, "price" | "sl" | "tp">>): SimState {
  return { ...state, pending: state.pending.map((o) => (o.id === id ? { ...o, ...patch } : o)) };
}

function checkExit(state: SimState, c: Candle, sameBarFill: boolean): SimState {
  const p = state.position;
  if (!p) return state;
  const d = dir(p.side);
  // MFE/MAE
  const fav = ((d === 1 ? c.high : c.low) - p.entry) * d;
  const adv = ((d === 1 ? c.low : c.high) - p.entry) * d;
  let s: SimState = { ...state, position: { ...p, mfe: Math.max(p.mfe, fav), mae: Math.min(p.mae, adv) } };
  const pos = s.position!;
  const hitSl = pos.sl != null && (d === 1 ? c.low <= pos.sl : c.high >= pos.sl);
  const hitTp = pos.tp != null && (d === 1 ? c.high >= pos.tp : c.low <= pos.tp);
  if (sameBarFill && !hitSl) return s; // no sabemos si el TP fue antes o después de la entrada
  if (hitSl) {
    const gap = d === 1 ? c.open <= pos.sl! : c.open >= pos.sl!;
    s = close(s, gap && !sameBarFill ? c.open : pos.sl!, c.time + 59, "sl");
  } else if (hitTp) {
    const gap = d === 1 ? c.open >= pos.tp! : c.open <= pos.tp!;
    s = close(s, gap ? c.open : pos.tp!, c.time + 59, "tp");
  }
  return s;
}

/** Procesa una vela base nueva: llenado de pendientes y luego stop/objetivo. */
export function step(state: SimState, c: Candle): SimState {
  let s = state;
  if (s.position) s = checkExit(s, c, false);
  if (!s.position && s.pending.length) {
    for (const o of s.pending) {
      const d = dir(o.side);
      // limit compra: precio baja hasta la orden; stop compra: precio sube hasta la orden.
      const touched =
        o.type === "limit" ? (d === 1 ? c.low <= o.price : c.high >= o.price) : d === 1 ? c.high >= o.price : c.low <= o.price;
      if (!touched) continue;
      const gapThrough = o.type === "limit" ? (d === 1 ? c.open < o.price : c.open > o.price) : d === 1 ? c.open > o.price : c.open < o.price;
      const fill = gapThrough ? c.open : o.price;
      s = {
        ...s,
        pending: s.pending.filter((x) => x.id !== o.id),
        position: { id: o.id, side: o.side, qty: o.qty, entry: fill, entryAt: c.time, sl: o.sl, tp: o.tp, initialSl: o.sl, mfe: 0, mae: 0 },
      };
      s = checkExit(s, c, true);
      break;
    }
  }
  return s;
}

/** PnL abierto en puntos al precio dado. */
export const openPoints = (p: Position, price: number) => (price - p.entry) * dir(p.side);

/** Contratos según riesgo en USD y distancia al stop. */
export function sizeForRisk(riskUsd: number, stopPoints: number, pointValue: number): number {
  if (!(riskUsd > 0) || !(stopPoints > 0) || !(pointValue > 0)) return 0;
  return Math.max(0, Math.floor(riskUsd / (stopPoints * pointValue)));
}
