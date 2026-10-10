import type { NextRequest } from "next/server";
import { getHistoricalRates } from "dukascopy-node";

/**
 * Velas de 1 minuto para el backtesting (replay).
 *
 *   GET /api/market/candles?symbol=nq&date=2026-09-15&source=futures
 *
 * Devuelve el día UTC completo como `[[t, o, h, l, c, v], ...]` con `t` en
 * segundos. Dos fuentes gratuitas:
 *  - `futures`: contrato continuo NQ=F / ES=F de Yahoo. Precio real de futuros,
 *    pero el 1m solo existe para los últimos ~30 días.
 *  - `index`: índice CFD de Dukascopy (USATECH = Nasdaq-100, USA500 = S&P 500).
 *    Historial de años; el precio difiere del futuro por la base.
 * Los días que ya cerraron no cambian, así que se cachean en la CDN.
 */

export const runtime = "nodejs";
export const maxDuration = 30;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36";

const SYMBOLS = {
  nq: { index: "usatechidxusd", futures: "NQ=F" },
  es: { index: "usa500idxusd", futures: "ES=F" },
} as const;

type Sym = keyof typeof SYMBOLS;
type Candle = [number, number, number, number, number, number];

// Dukascopy responde 429 a clientes sin User-Agent de navegador; dukascopy-node
// usa el fetch global sin headers, así que se los agregamos solo para su dominio.
const g = globalThis as typeof globalThis & { __dukaPatched?: boolean };
if (!g.__dukaPatched) {
  const original = g.fetch.bind(g);
  g.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.includes("dukascopy.com")) {
      const headers = new Headers(init?.headers);
      headers.set("User-Agent", UA);
      headers.set("Referer", "https://www.dukascopy.com/");
      return original(input, { ...init, headers });
    }
    return original(input, init);
  }) as typeof fetch;
  g.__dukaPatched = true;
}

async function fromIndex(sym: Sym, from: Date, to: Date): Promise<Candle[]> {
  const rows = await getHistoricalRates({
    instrument: SYMBOLS[sym].index,
    dates: { from, to },
    timeframe: "m1",
    priceType: "bid",
    format: "array",
    volumes: true,
    ignoreFlats: true,
    useCache: false,
    retryCount: 2,
    pauseBetweenRetriesMs: 500,
  });
  return rows
    .filter((r) => r[0] >= from.getTime() && r[0] < to.getTime())
    .map(([t, o, h, l, c, v]) => [Math.floor(t / 1000), o, h, l, c, Math.round(v ?? 0)]);
}

interface YahooChart {
  chart?: {
    result?: {
      timestamp?: number[];
      indicators?: { quote?: { open: (number | null)[]; high: (number | null)[]; low: (number | null)[]; close: (number | null)[]; volume: (number | null)[] }[] };
    }[];
    error?: { description?: string } | null;
  };
}

async function fromFutures(sym: Sym, from: Date, to: Date): Promise<Candle[]> {
  const p1 = Math.floor(from.getTime() / 1000);
  const p2 = Math.floor(to.getTime() / 1000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(SYMBOLS[sym].futures)}?interval=1m&period1=${p1}&period2=${p2}&includePrePost=true`;
  const r = await fetch(url, { headers: { "User-Agent": UA }, cache: "no-store" });
  if (!r.ok) throw new Error(`Yahoo respondió ${r.status}`);
  const json = (await r.json()) as YahooChart;
  const res = json.chart?.result?.[0];
  const ts = res?.timestamp ?? [];
  const q = res?.indicators?.quote?.[0];
  if (!q) return [];
  const out: Candle[] = [];
  for (let i = 0; i < ts.length; i++) {
    const o = q.open[i], h = q.high[i], l = q.low[i], c = q.close[i];
    if (o == null || h == null || l == null || c == null) continue;
    const t = ts[i] - (ts[i] % 60);
    if (t < p1 || t >= p2) continue;
    if (out.length && out[out.length - 1][0] === t) continue;
    out.push([t, o, h, l, c, q.volume[i] ?? 0]);
  }
  return out;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const symbol = sp.get("symbol")?.toLowerCase() as Sym | undefined;
  const date = sp.get("date") ?? "";
  const source = sp.get("source") === "futures" ? "futures" : "index";
  if (!symbol || !(symbol in SYMBOLS)) {
    return Response.json({ error: "symbol tiene que ser nq o es" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "date tiene que ser yyyy-MM-dd" }, { status: 400 });
  }
  const from = new Date(`${date}T00:00:00Z`);
  const to = new Date(from.getTime() + 86_400_000);
  const now = Date.now();
  if (Number.isNaN(from.getTime()) || from.getTime() > now) return Response.json({ candles: [] });

  try {
    const candles = source === "futures" ? await fromFutures(symbol, from, to) : await fromIndex(symbol, from, to);
    const closed = to.getTime() + 3 * 3_600_000 < now;
    return Response.json(
      { candles },
      {
        headers: {
          "Cache-Control":
            closed && candles.length
              ? "public, max-age=86400, s-maxage=31536000, immutable"
              : "public, max-age=60, s-maxage=300",
        },
      },
    );
  } catch (err) {
    console.error("[market] Error trayendo velas:", err);
    return Response.json({ error: "No pude traer datos de mercado para ese día." }, { status: 502 });
  }
}
