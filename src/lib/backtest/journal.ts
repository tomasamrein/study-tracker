import { EMPTY_RULES } from "../trading/defaults";
import type { Instrument, ListItem, Trade, TradingAccount, TradingState } from "../trading/types";
import type { ClosedTrade } from "./sim";
import { NY, localMinuteOfDay, toLocalString } from "./time";

export const BACKTEST_MODE = "backtest";

const EXTRA_INSTRUMENTS: Instrument[] = [
  { id: "mes", symbol: "MES", name: "Micro E-mini S&P 500", pointValue: 5, commission: 0, micro: true },
  { id: "es", symbol: "ES", name: "E-mini S&P 500", pointValue: 50, commission: 0, micro: false },
];

/**
 * Deja el estado listo para backtestear sin tocar nada de lo existente:
 * agrega ES/MES si faltan, el setup iFVG y una cuenta "Backtest" si no hay
 * ninguna en ese modo. Devuelve el mismo objeto si no hace falta nada.
 */
export function ensureBacktestReady(state: TradingState): TradingState {
  let next = state;
  const syms = new Set(state.instruments.map((i) => i.symbol.toUpperCase()));
  const missing = EXTRA_INSTRUMENTS.filter((i) => !syms.has(i.symbol) && !state.instruments.some((x) => x.id === i.id));
  if (missing.length) next = { ...next, instruments: [...next.instruments, ...missing] };
  if (!next.setups.some((s) => s.name.toLowerCase().replace(/\s/g, "") === "ifvg")) {
    const setup: ListItem = { id: "ifvg", name: "iFVG" };
    next = { ...next, setups: [...next.setups.filter((s) => s.id !== "ifvg"), setup] };
  }
  if (!next.modes.some((m) => m.id === BACKTEST_MODE)) {
    next = { ...next, modes: [{ id: BACKTEST_MODE, name: "Backtest", hidden: false, targetTrades: 100 }, ...next.modes] };
  }
  if (!next.accounts.some((a) => a.modeId === BACKTEST_MODE && a.status === "activa")) {
    const acc: TradingAccount = {
      id: "backtest-replay",
      name: "Backtest (replay)",
      modeId: BACKTEST_MODE,
      firm: "Replay",
      status: "activa",
      size: 50000,
      startDate: new Date().toISOString().slice(0, 10),
      cost: 0,
      recurring: false,
      rules: { ...EMPTY_RULES },
      notes: "Cuenta creada automáticamente por el backtesting.",
      createdAt: new Date().toISOString(),
    };
    next = { ...next, accounts: [...next.accounts.filter((a) => a.id !== acc.id), acc] };
  }
  return next;
}

export function backtestAccountId(state: TradingState): string | null {
  return state.accounts.find((a) => a.modeId === BACKTEST_MODE && a.status === "activa")?.id ?? null;
}

/** Sesión del diario según la hora de NY de la entrada. */
export function sessionFor(state: TradingState, t: number): string | null {
  const m = localMinuteOfDay(NY, t);
  const want = m >= 20 * 60 || m < 2 * 60 ? "asia" : m < 8 * 60 ? "londres" : m < 12 * 60 ? "am" : "pm";
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[^a-z ]/g, "");
  const found = state.sessions.find((s) => {
    const n = norm(s.name);
    if (want === "asia") return n.includes("asia");
    if (want === "londres") return n.includes("londres") || n.includes("london");
    if (want === "am") return n.includes("am");
    return n.includes("pm");
  });
  return found?.id ?? null;
}

export function closedToTrade(
  ct: ClosedTrade,
  ctx: { state: TradingState; accountId: string; instrumentId: string; setupId: string | null; tf: string; label: string },
): Trade {
  const tz = ctx.state.settings.timezone;
  const reason = { sl: "Stop", tp: "Objetivo", manual: "Cierre manual", be: "Breakeven" }[ct.reason];
  return {
    id: `bt-${ct.id}`,
    accountId: ctx.accountId,
    modeId: BACKTEST_MODE,
    instrumentId: ctx.instrumentId,
    direction: ct.side,
    entryAt: toLocalString(tz, ct.entryAt),
    exitAt: toLocalString(tz, ct.exitAt),
    entry: round(ct.entry),
    exit: round(ct.exit),
    stop: ct.initialSl != null ? round(ct.initialSl) : null,
    target: ct.tp != null ? round(ct.tp) : null,
    contracts: ct.qty,
    commission: null,
    setupId: ctx.setupId,
    entryTf: ctx.tf,
    sessionId: sessionFor(ctx.state, ct.entryAt),
    followedPlan: true,
    notes: `Replay ${ctx.label} · ${reason} · MFE ${ct.mfe.toFixed(2)} / MAE ${ct.mae.toFixed(2)} pts`,
    tags: ["replay"],
    emotionTags: [],
    createdAt: new Date().toISOString(),
  };
}

const round = (n: number) => Math.round(n * 100) / 100;
