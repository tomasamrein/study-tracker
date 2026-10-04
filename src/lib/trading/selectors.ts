"use client";

import { useMemo } from "react";
import { useTrading } from "./store";
import { enrich, type Enriched } from "./calc";
import { ALL_MODES, type TradingState } from "./types";

export interface TradeFilters {
  accountId?: string;
  setupId?: string;
  sessionId?: string;
  instrumentId?: string;
  from?: string;
  to?: string;
}

/** Aplica el modo global y los filtros a los trades. Pura. */
export function filterTrades(state: TradingState, f: TradeFilters = {}, modeId = state.settings.selectedModeId): Enriched[] {
  const list = state.trades.filter(
    (t) =>
      (modeId === ALL_MODES || t.modeId === modeId) &&
      (!f.accountId || t.accountId === f.accountId) &&
      (!f.setupId || t.setupId === f.setupId) &&
      (!f.sessionId || t.sessionId === f.sessionId) &&
      (!f.instrumentId || t.instrumentId === f.instrumentId) &&
      (!f.from || t.entryAt.slice(0, 10) >= f.from) &&
      (!f.to || t.entryAt.slice(0, 10) <= f.to),
  );
  return enrich(list, state.instruments);
}

export function useFilteredTrades(f: TradeFilters = {}): Enriched[] {
  const { state } = useTrading();
  const { accountId, setupId, sessionId, instrumentId, from, to } = f;
  return useMemo(
    () => filterTrades(state, { accountId, setupId, sessionId, instrumentId, from, to }),
    [state, accountId, setupId, sessionId, instrumentId, from, to],
  );
}

/** Helpers de nombres. */
export function useNames() {
  const { state } = useTrading();
  return useMemo(() => {
    const m = <T extends { id: string }>(l: T[], k: (x: T) => string) => {
      const map = new Map(l.map((x) => [x.id, k(x)]));
      return (id?: string | null) => (id ? (map.get(id) ?? "—") : "—");
    };
    return {
      mode: m(state.modes, (x) => x.name),
      account: m(state.accounts, (x) => x.name),
      instrument: m(state.instruments, (x) => x.symbol),
      setup: m(state.setups, (x) => x.name),
      session: m(state.sessions, (x) => x.name),
    };
  }, [state]);
}
