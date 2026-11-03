// Stripe webhook: marks the payment paid and activates the plan (checkout.session.completed).
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const raw = await req.text();
  const header = req.headers.get("stripe-signature") ?? "";
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=") as [string, string]));
  const expected = crypto.createHmac("sha256", process.env.STRIPE_WEBHOOK_SECRET ?? "").update(`${parts.t}.${raw}`).digest("hex");
  if (!parts.v1 || parts.v1.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(parts.v1), Buffer.from(expected))) return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  const event = JSON.parse(raw);
  if (event.type === "checkout.session.completed") {
    const s = event.data.object;
    const pay = await db.payment.findFirst({ where: { providerRef: s.id } });
    if (pay) {
      await db.payment.update({ where: { id: pay.id }, data: { status: "paid", paymentRef: s.payment_intent ?? s.subscription ?? null } });
      await db.user.update({ where: { id: pay.userId }, data: { plan: pay.plan } });
    }
  }
  return NextResponse.json({ received: true });
}
