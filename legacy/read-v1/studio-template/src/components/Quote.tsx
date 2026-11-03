"use client";
// Live price from /api/quote (needs MARKET_DATA_KEY on the server). Refreshes every 30 seconds.
import { useEffect, useState } from "react";

export default function Quote({ symbol }: { symbol: string }) {
  const [q, setQ] = useState<{ price?: number; change?: number; percent?: number; error?: string } | null>(null);
  useEffect(() => {
    let on = true;
    const load = () => fetch(`/api/quote?symbol=${encodeURIComponent(symbol)}`).then((r) => r.json()).then((j) => on && setQ(j)).catch(() => on && setQ({ error: "Offline" }));
    load(); const t = setInterval(load, 30000);
    return () => { on = false; clearInterval(t); };
  }, [symbol]);
  if (!q) return <span className="muted small">Loading live price…</span>;
  if (q.error) return <span className="muted small">Live price: {q.error}</span>;
  const up = (q.change ?? 0) >= 0;
  return <span className={up ? "up" : "down"}><b>{q.price?.toLocaleString("en-IN")}</b> {up ? "▲" : "▼"} {q.change?.toFixed(2)} ({q.percent?.toFixed(2)}%)</span>;
}
