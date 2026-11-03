// Live quote proxy. Set MARKET_DATA_PROVIDER=finnhub|twelvedata and MARKET_DATA_KEY. Cached for 30 s.
import { NextResponse } from "next/server";

const cache = new Map<string, { at: number; body: unknown }>();

export async function GET(req: Request) {
  const symbol = new URL(req.url).searchParams.get("symbol")?.trim().toUpperCase();
  if (!symbol || !/^[A-Z0-9.:&-]{1,20}$/.test(symbol)) return NextResponse.json({ error: "Bad symbol" }, { status: 400 });
  const key = process.env.MARKET_DATA_KEY; const provider = process.env.MARKET_DATA_PROVIDER || "twelvedata";
  if (!key) return NextResponse.json({ error: "not configured (add MARKET_DATA_KEY)" });
  const hit = cache.get(symbol);
  if (hit && Date.now() - hit.at < 30000) return NextResponse.json(hit.body);
  let body: { price?: number; change?: number; percent?: number; error?: string };
  try {
    if (provider === "finnhub") {
      const j = await (await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${key}`)).json();
      body = j.c ? { price: j.c, change: j.d, percent: j.dp } : { error: "No data" };
    } else {
      const j = await (await fetch(`https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbol)}&apikey=${key}`)).json();
      body = j.close ? { price: Number(j.close), change: Number(j.change), percent: Number(j.percent_change) } : { error: j.message ?? "No data" };
    }
  } catch { body = { error: "Provider unreachable" }; }
  cache.set(symbol, { at: Date.now(), body });
  return NextResponse.json(body);
}
