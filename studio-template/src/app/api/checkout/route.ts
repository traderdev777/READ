// Starts a payment for a plan. Razorpay: creates an order. Stripe: creates a hosted Checkout Session.
import { NextResponse } from "next/server";
import { cfg, siteUrl } from "@/lib/config";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Log in first" }, { status: 401 });
  const { plan: name } = await req.json();
  const plan = cfg.plans.find((p) => p.name === name);
  if (!plan) return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
  if (!plan.price) { await db.user.update({ where: { id: user.id }, data: { plan: plan.name } }); return NextResponse.json({ free: true }); }

  if (cfg.features.payments === "razorpay") {
    const id = process.env.RAZORPAY_KEY_ID, secret = process.env.RAZORPAY_KEY_SECRET;
    if (!id || !secret) return NextResponse.json({ error: "Payments aren't configured yet (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)" }, { status: 503 });
    const r = await fetch("https://api.razorpay.com/v1/orders", { method: "POST", headers: { "content-type": "application/json", authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64") }, body: JSON.stringify({ amount: Math.round(plan.price * 100), currency: "INR", receipt: `u_${user.id.slice(0, 20)}`, notes: { userId: user.id, plan: plan.name } }) });
    const order = await r.json();
    if (!r.ok) return NextResponse.json({ error: order?.error?.description ?? "Razorpay error" }, { status: 502 });
    await db.payment.create({ data: { userId: user.id, plan: plan.name, amount: plan.price, provider: "razorpay", providerRef: order.id, status: "created" } });
    return NextResponse.json({ keyId: id, orderId: order.id, amount: order.amount, name: cfg.name, email: user.email });
  }

  if (cfg.features.payments === "stripe") {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return NextResponse.json({ error: "Payments aren't configured yet (STRIPE_SECRET_KEY)" }, { status: 503 });
    const body = new URLSearchParams({
      mode: plan.period === "once" ? "payment" : "subscription", success_url: `${siteUrl()}/checkout/success`, cancel_url: `${siteUrl()}/pricing`,
      customer_email: user.email, client_reference_id: user.id, "metadata[plan]": plan.name, "metadata[userId]": user.id,
      "line_items[0][quantity]": "1", "line_items[0][price_data][currency]": "inr", "line_items[0][price_data][unit_amount]": String(Math.round(plan.price * 100)),
      "line_items[0][price_data][product_data][name]": `${cfg.name} ${plan.name}`,
      ...(plan.period !== "once" ? { "line_items[0][price_data][recurring][interval]": plan.period } : {}),
    });
    const r = await fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/x-www-form-urlencoded" }, body });
    const s = await r.json();
    if (!r.ok) return NextResponse.json({ error: s?.error?.message ?? "Stripe error" }, { status: 502 });
    await db.payment.create({ data: { userId: user.id, plan: plan.name, amount: plan.price, provider: "stripe", providerRef: s.id, status: "created" } });
    return NextResponse.json({ url: s.url });
  }
  return NextResponse.json({ error: "Payments are off" }, { status: 400 });
}
