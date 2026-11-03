import { notFound } from "next/navigation";
import { cfg, money } from "@/lib/config";
import { currentUser } from "@/lib/auth";
import Checkout from "@/components/Checkout";

export const metadata = { title: "Pricing" };
export default async function Pricing({ searchParams }: { searchParams: Promise<{ failed?: string }> }) {
  if (cfg.features.payments === "none" || !cfg.plans.length) notFound();
  const user = await currentUser(); const { failed } = await searchParams;
  const configured = cfg.features.payments === "razorpay" ? !!process.env.RAZORPAY_KEY_ID : !!process.env.STRIPE_SECRET_KEY;
  return (
    <section><div className="wrap">
      <h1>Pricing</h1>
      {failed && <p className="err">Payment didn&apos;t go through. Try again.</p>}
      {!configured && <p className="muted">Payments are in test setup: add {cfg.features.payments === "razorpay" ? "RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET" : "STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET"} to .env to take real payments.</p>}
      <div className="grid">{cfg.plans.map((p) => (
        <div key={p.name} className="card plan">
          <h3>{p.name}</h3>
          <div className="amt">{p.price ? money(p.price) : "Free"}{p.price ? <span className="muted small"> / {p.period}</span> : null}</div>
          <ul>{p.perks.map((x) => <li key={x}>{x}</li>)}</ul>
          {user?.plan === p.name ? <span className="chip">Your plan</span> : <Checkout plan={p.name} label={p.price ? `Buy ${p.name}` : "Start free"} />}
        </div>))}</div>
    </div></section>
  );
}
