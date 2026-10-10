export const runtime = "nodejs";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36";

export async function GET() {
  const tests: { name: string; url: string; headers: Record<string, string> }[] = [
    { name: "duka-plain", url: "https://datafeed.dukascopy.com/datafeed/USATECHIDXUSD/2026/08/15/BID_candles_min_1.bi5", headers: {} },
    {
      name: "duka-ua",
      url: "https://datafeed.dukascopy.com/datafeed/USATECHIDXUSD/2026/08/15/BID_candles_min_1.bi5",
      headers: { "User-Agent": UA, Accept: "*/*", Referer: "https://www.dukascopy.com/" },
    },
    {
      name: "yahoo",
      url: "https://query1.finance.yahoo.com/v8/finance/chart/NQ=F?interval=1m&period1=1789776000&period2=1790294400",
      headers: { "User-Agent": UA },
    },
  ];
  const out: unknown[] = [];
  for (const t of tests) {
    try {
      const r = await fetch(t.url, { headers: t.headers, cache: "no-store" });
      const b = await r.arrayBuffer();
      const text = new TextDecoder().decode(b.slice(0, 400));
      out.push({ name: t.name, status: r.status, len: b.byteLength, ct: r.headers.get("content-type"), sample: text.replace(/[^\x20-\x7e]/g, ".").slice(0, 300) });
    } catch (e) {
      out.push({ name: t.name, error: String(e) });
    }
  }
  return Response.json(out);
}
