"use server";
import { headers } from "next/headers";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

export type WaitlistState =
  | { status: "idle" }
  | { status: "ok"; message: string }
  | { status: "duplicate"; message: string }
  | { status: "error"; message: string };

const schema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, "That email is too long.")
    .email("Enter a valid email address."),
  source: z
    .string()
    .trim()
    .max(64)
    .regex(/^[a-z0-9-]+$/)
    .default("landing"),
  // Honeypot: real people never fill this.
  company: z.string().max(0).optional(),
});

export async function joinWaitlist(_prev: WaitlistState, form: FormData): Promise<WaitlistState> {
  const parsed = schema.safeParse({
    email: form.get("email") ?? "",
    source: form.get("source") || "landing",
    company: form.get("company") ?? "",
  });
  if (!parsed.success)
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Check the email and try again.",
    };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const limit = rateLimit(`waitlist:${ip}`);
  if (!limit.ok)
    return {
      status: "error",
      message: `Too many attempts from this network. Try again in ${Math.ceil(limit.retryAfter / 60)} min.`,
    };

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key)
    return { status: "error", message: "The waitlist isn't connected on this deployment yet." };

  const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/waitlist`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ email: parsed.data.email, source: parsed.data.source }),
    cache: "no-store",
  }).catch(() => null);

  if (!res)
    return { status: "error", message: "Couldn't reach the waitlist. Try again in a minute." };
  if (res.status === 201 || res.status === 204)
    return { status: "ok", message: "You're on the list. We'll email you when scans open." };
  const body = (await res.json().catch(() => ({}))) as { code?: string };
  if (res.status === 409 || body.code === "23505")
    return { status: "duplicate", message: "You're already on the list." };
  return { status: "error", message: "The waitlist rejected that request. Try again shortly." };
}
