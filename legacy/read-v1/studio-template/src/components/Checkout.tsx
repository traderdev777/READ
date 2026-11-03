"use client";
// Pays for a plan with Razorpay (in-page checkout) or Stripe (hosted checkout).
import { useState } from "react";

declare global { interface Window { Razorpay?: new (o: Record<string, unknown>) => { open: () => void } } }
const loadRzp = () => new Promise<void>((res, rej) => { if (window.Razorpay) return res(); const s = document.createElement("script"); s.src = "https://checkout.razorpay.com/v1/checkout.js"; s.onload = () => res(); s.onerror = rej; document.body.appendChild(s); });

export default function Checkout({ plan, label }: { plan: string; label: string }) {
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState("");
  const pay = async () => {
    setBusy(true); setMsg("");
    const r = await fetch("/api/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan }) });
    const j = await r.json();
    if (r.status === 401) { location.href = `/login?next=/pricing`; return; }
    if (!r.ok) { setMsg(j.error ?? "Checkout failed"); setBusy(false); return; }
    if (j.url) { location.href = j.url; return; }
    if (j.free) { location.href = "/checkout/success"; return; }
    await loadRzp();
    new window.Razorpay!({
      key: j.keyId, order_id: j.orderId, amount: j.amount, currency: "INR", name: j.name, description: `${plan} plan`, prefill: { email: j.email },
      handler: async (resp: Record<string, string>) => {
        const v = await fetch("/api/checkout/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(resp) });
        location.href = v.ok ? "/checkout/success" : "/pricing?failed=1";
      },
      modal: { ondismiss: () => setBusy(false) },
    }).open();
  };
  return <><button className="btn" onClick={pay} disabled={busy}>{busy ? "Opening…" : label}</button>{msg && <p className="err small">{msg}</p>}</>;
}
