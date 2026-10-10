import { bucketStart, mergeCandles, type Candle } from "./candles";
import {
  cancelPending,
  closePosition,
  emptySim,
  marketOrder,
  modifyPending,
  modifyPosition,
  placePending,
  step,
  type PendingOrder,
  type SimState,
  type Side,
} from "./sim";
import { tradingDay } from "./time";

/** Núcleo del replay: velas base cargadas, hasta dónde se ve y el simulador. */
export interface ReplayCore {
  m1: Candle[];
  /** Índice de la última vela base visible (−1 = nada cargado). */
  cursor: number;
  sim: SimState;
}

export type ReplayAction =
  | { type: "load"; m1: Candle[]; cursor: number; sim?: SimState }
  | { type: "append"; m1: Candle[] }
  | { type: "advance"; n: number }
  | { type: "advanceBucket"; minutes: number }
  | { type: "advanceTo"; time: number }
  | { type: "market"; side: Side; qty: number; sl: number | null; tp: number | null }
  | { type: "pending"; order: Omit<PendingOrder, "id" | "createdAt"> }
  | { type: "cancel"; id: string }
  | { type: "close" }
  | { type: "modifyPos"; sl?: number | null; tp?: number | null }
  | { type: "modifyPending"; id: string; price?: number; sl?: number | null; tp?: number | null }
  | { type: "resetSim" };

export const initialCore: ReplayCore = { m1: [], cursor: -1, sim: emptySim() };

function advance(core: ReplayCore, n: number): ReplayCore {
  let { sim, cursor } = core;
  const max = core.m1.length - 1;
  for (let i = 0; i < n && cursor < max; i++) {
    cursor++;
    sim = step(sim, core.m1[cursor]);
  }
  return cursor === core.cursor ? core : { ...core, cursor, sim };
}

export function replayReducer(core: ReplayCore, a: ReplayAction): ReplayCore {
  const last = core.m1[core.cursor];
  switch (a.type) {
    case "load":
      return { m1: a.m1, cursor: a.cursor, sim: a.sim ?? emptySim() };
    case "append": {
      const t = last?.time;
      const m1 = mergeCandles(core.m1, a.m1);
      const cursor = t == null ? core.cursor : m1.findIndex((c) => c.time === t);
      return { ...core, m1, cursor: cursor < 0 ? core.cursor : cursor };
    }
    case "advance":
      return advance(core, a.n);
    case "advanceBucket": {
      // Avanza hasta que cierra la vela actual del timeframe (o una entera si ya cerró).
      if (!last) return core;
      const next = core.m1[core.cursor + 1];
      if (!next) return core;
      const key = (c: Candle) => (a.minutes >= 1440 ? tradingDay(c.time) : String(bucketStart(c.time, a.minutes)));
      const target = key(next);
      let n = 0;
      while (core.cursor + n + 1 < core.m1.length && key(core.m1[core.cursor + n + 1]) === target) n++;
      return advance(core, Math.max(1, n));
    }
    case "advanceTo": {
      let n = 0;
      while (core.cursor + n + 1 < core.m1.length && core.m1[core.cursor + n + 1].time <= a.time) n++;
      return advance(core, n);
    }
    case "market":
      if (!last) return core;
      return { ...core, sim: marketOrder(core.sim, a.side, a.qty, last.close, last.time + 59, a.sl, a.tp) };
    case "pending":
      if (!last) return core;
      return { ...core, sim: placePending(core.sim, { ...a.order, createdAt: last.time }) };
    case "cancel":
      return { ...core, sim: cancelPending(core.sim, a.id) };
    case "close":
      if (!last) return core;
      return { ...core, sim: closePosition(core.sim, last.close, last.time + 59) };
    case "modifyPos": {
      const patch: { sl?: number | null; tp?: number | null } = {};
      if (a.sl !== undefined) patch.sl = a.sl;
      if (a.tp !== undefined) patch.tp = a.tp;
      return { ...core, sim: modifyPosition(core.sim, patch) };
    }
    case "modifyPending": {
      const patch: { price?: number; sl?: number | null; tp?: number | null } = {};
      if (a.price !== undefined) patch.price = a.price;
      if (a.sl !== undefined) patch.sl = a.sl;
      if (a.tp !== undefined) patch.tp = a.tp;
      return { ...core, sim: modifyPending(core.sim, a.id, patch) };
    }
    case "resetSim":
      return { ...core, sim: emptySim() };
  }
}
