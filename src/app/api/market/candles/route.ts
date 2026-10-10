import type { NextRequest } from "next/server";
import { getHistoricalRates } from "dukascopy-node";

/**
 * Velas de 1 minuto para el backtesting (replay).
 *
 *   GET /api/market/candles?symbol=nq&date=2026-09-15
 *
 * Devuelve el día UTC completo como `[[t, o, h, l, c, v], ...]` con `t` en
 * segundos. Fuente: datafeed histórico gratuito de Dukascopy (índice CFD:
 * USATECH = Nasdaq-100, USA500 = S&P 500). Los días pasados no cambian, así que
 * se cachean en la CDN de Vercel por un año.
 */

export const runtime = "nodejs";
export const maxDuration = 30;

const INSTRUMENTS = {
  nq: "usatechidxusd",
  es: "usa500idxusd",
} as const;

type Symbol = keyof typeof INSTRUMENTS;

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.toLowerCase() as Symbol | undefined;
  const date = req.nextUrl.searchParams.get("date") ?? "";
  if (!symbol || !(symbol in INSTRUMENTS)) {
    return Response.json({ error: "symbol tiene que ser nq o es" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "date tiene que ser yyyy-MM-dd" }, { status: 400 });
  }
  const from = new Date(`${date}T00:00:00Z`);
  const to = new Date(from.getTime() + 86_400_000);
  const now = Date.now();
  if (from.getTime() > now) return Response.json({ candles: [] });

  try {
    const rows = await getHistoricalRates({
      instrument: INSTRUMENTS[symbol],
      dates: { from, to },
      timeframe: "m1",
      priceType: "bid",
      format: "array",
      volumes: true,
      ignoreFlats: true,
      useCache: false,
      retryCount: 2,
      pauseBetweenRetriesMs: 300,
    });
    const candles = rows
      .filter((r) => r[0] >= from.getTime() && r[0] < to.getTime())
      .map(([t, o, h, l, c, v]) => [Math.floor(t / 1000), o, h, l, c, Math.round(v ?? 0)]);
    // Un día que ya terminó (con margen) no cambia más: cache largo.
    const closed = to.getTime() + 3 * 3_600_000 < now;
    return Response.json(
      { candles },
      {
        headers: {
          "Cache-Control": closed
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
