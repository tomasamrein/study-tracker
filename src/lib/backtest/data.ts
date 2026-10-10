import type { Candle } from "./candles";

export type MarketSymbol = "nq" | "es";

const memory = new Map<string, Promise<Candle[]>>();

/** Velas de 1m de un día UTC. Cacheadas en memoria (y por el navegador/CDN). */
export function fetchDay(symbol: MarketSymbol, day: string, source: "futures" | "index"): Promise<Candle[]> {
  const key = `${symbol}|${source}|${day}`;
  const hit = memory.get(key);
  if (hit) return hit;
  const p = fetch(`/api/market/candles?symbol=${symbol}&date=${day}&source=${source}`)
    .then(async (r) => {
      const j = (await r.json()) as { candles?: number[][]; error?: string };
      if (!r.ok) throw new Error(j.error ?? `Error ${r.status}`);
      return (j.candles ?? []).map(([time, open, high, low, close, volume]) => ({ time, open, high, low, close, volume }));
    })
    .catch((err) => {
      memory.delete(key);
      throw err;
    });
  memory.set(key, p);
  return p;
}

/** Varios días en paralelo, unidos y ordenados. */
export async function fetchDays(symbol: MarketSymbol, days: string[], source: "futures" | "index"): Promise<Candle[]> {
  const parts = await Promise.all(days.map((d) => fetchDay(symbol, d, source)));
  return parts.flat().sort((a, b) => a.time - b.time);
}

/** Símbolo de datos según el instrumento del diario (MNQ/NQ → nq, MES/ES → es). */
export function marketSymbolFor(symbol: string): MarketSymbol | null {
  const s = symbol.toUpperCase();
  if (s.includes("NQ") || s.includes("NAS")) return "nq";
  if (s.includes("ES") || s.includes("SP") || s.includes("500")) return "es";
  return null;
}
