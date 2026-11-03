// Razorpay: verify the payment signature, then activate the plan.
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Log in first" }, { status: 401 });
  const { razorpay_order_id: o, razorpay_payment_id: p, razorpay_signature: sig } = await req.json();
  const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET ?? "").update(`${o}|${p}`).digest("hex");
  if (!sig || expected.length !== String(sig).length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(sig)))) return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  const pay = await db.payment.findFirst({ where: { providerRef: o, userId: user.id } });
  if (!pay) return NextResponse.json({ error: "Unknown order" }, { status: 404 });
  await db.payment.update({ where: { id: pay.id }, data: { status: "paid", paymentRef: p } });
  await db.user.update({ where: { id: user.id }, data: { plan: pay.plan } });
  return NextResponse.json({ ok: true });
}
