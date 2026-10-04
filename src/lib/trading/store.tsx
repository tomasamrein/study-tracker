"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../auth";
import { isFirebaseConfigured } from "../firebase";
import { freshTradingState, migrateTradingState } from "./defaults";
import { loadTrading, saveTrading } from "./storage";
import type { TradingState } from "./types";

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Colecciones del estado que son listas de objetos con `id`. */
export type TradingCollection =
  | "modes"
  | "accounts"
  | "instruments"
  | "trades"
  | "setups"
  | "sessions"
  | "emotions"
  | "tags"
  | "payouts"
  | "expenses"
  | "preChecklist"
  | "closeChecklist"
  | "reviews"
  | "phaseGoals";

type Item<K extends TradingCollection> = TradingState[K][number];

interface TradingStoreValue {
  loaded: boolean;
  state: TradingState;
  /** Actualización libre (para cambios que tocan varias partes). */
  update: (fn: (prev: TradingState) => TradingState) => void;
  /** Agrega o reemplaza (por id) un ítem de una colección. */
  upsert: <K extends TradingCollection>(key: K, item: Item<K>) => void;
  patch: <K extends TradingCollection>(key: K, id: string, patch: Partial<Item<K>>) => void;
  remove: <K extends TradingCollection>(key: K, id: string) => void;
  updateSettings: (patch: Partial<TradingState["settings"]>) => void;
  replaceAll: (state: TradingState) => void;
}

const Ctx = createContext<TradingStoreValue | null>(null);

export function TradingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [state, setState] = useState<TradingState>(freshTradingState);
  const [loadedUid, setLoadedUid] = useState<string | null>(null);
  const loaded = uid !== null && loadedUid === uid;
  const skipSave = useRef(true);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    skipSave.current = true;
    loadTrading(uid).then((saved) => {
      if (cancelled) return;
      setState(migrateTradingState(saved));
      setLoadedUid(uid);
      requestAnimationFrame(() => {
        skipSave.current = false;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  useEffect(() => {
    if (skipSave.current || !uid) return;
    const t = setTimeout(() => {
      saveTrading(uid, state).then((ok) => {
        if (!ok && isFirebaseConfigured) {
          toast.error("Error al guardar Trading en la nube. Quedó guardado en este dispositivo.");
        }
      });
    }, 400);
    return () => clearTimeout(t);
  }, [state, uid]);

  const update = useCallback((fn: (prev: TradingState) => TradingState) => setState(fn), []);

  const upsert = useCallback(<K extends TradingCollection>(key: K, item: Item<K>) => {
    setState((prev) => {
      const list = prev[key] as Item<K>[];
      const exists = list.some((x) => x.id === item.id);
      return {
        ...prev,
        [key]: exists ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item],
      };
    });
  }, []);

  const patch = useCallback(<K extends TradingCollection>(key: K, id: string, p: Partial<Item<K>>) => {
    setState((prev) => ({
      ...prev,
      [key]: (prev[key] as Item<K>[]).map((x) => (x.id === id ? { ...x, ...p } : x)),
    }));
  }, []);

  const remove = useCallback(<K extends TradingCollection>(key: K, id: string) => {
    setState((prev) => ({
      ...prev,
      [key]: (prev[key] as Item<K>[]).filter((x) => x.id !== id),
    }));
  }, []);

  const updateSettings = useCallback((p: Partial<TradingState["settings"]>) => {
    setState((prev) => ({ ...prev, settings: { ...prev.settings, ...p } }));
  }, []);

  const replaceAll = useCallback((s: TradingState) => setState(migrateTradingState(s)), []);

  const value = useMemo(
    () => ({ loaded, state, update, upsert, patch, remove, updateSettings, replaceAll }),
    [loaded, state, update, upsert, patch, remove, updateSettings, replaceAll],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTrading(): TradingStoreValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTrading debe usarse dentro de <TradingProvider>");
  return v;
}

/** Modos visibles en el selector. */
export function useVisibleModes() {
  const { state } = useTrading();
  return state.modes.filter((m) => !m.hidden);
}
