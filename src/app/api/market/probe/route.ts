export const runtime = "nodejs";
export async function GET() {
  const url = "https://datafeed.dukascopy.com/datafeed/USATECHIDXUSD/2026/08/15/BID_candles_min_1.bi5";
  const out: unknown[] = [];
  for (const headers of [
    {},
    {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36",
      Accept: "*/*",
      Referer: "https://www.dukascopy.com/",
    },
  ]) {
    const r = await fetch(url, { headers, cache: "no-store" });
    const b = await r.arrayBuffer();
    out.push({ status: r.status, len: b.byteLength, h: Object.fromEntries(r.headers), body: r.status !== 200 ? new TextDecoder().decode(b).slice(0, 300) : "" });
  }
  return Response.json(out);
}
