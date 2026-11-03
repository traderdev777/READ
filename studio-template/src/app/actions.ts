"use server";
// All form submissions in the app go through these server actions.
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { currentUser, requireUser, requireAdmin, hashPassword, checkPassword, startSession, endSession } from "@/lib/auth";
import { cfg, entityBySlug, slugOf } from "@/lib/config";
import { parseForm, createItem, updateItem, deleteItem, getItem } from "@/lib/items";

export type FormState = { error?: string; ok?: string } | undefined;
const safeNext = (n: FormDataEntryValue | null) => (typeof n === "string" && n.startsWith("/") && !n.startsWith("//") ? n : "/dashboard");

export async function signup(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const name = String(form.get("name") ?? "").trim().slice(0, 80) || null;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter a valid email" };
  if (password.length < 8) return { error: "Password must be at least 8 characters" };
  if (await db.user.findUnique({ where: { email } })) return { error: "An account with this email already exists" };
  const first = (await db.user.count()) === 0;
  const user = await db.user.create({ data: { email, name, passwordHash: await hashPassword(password), role: first || email === process.env.ADMIN_EMAIL?.toLowerCase() ? "admin" : "user" } });
  await startSession(user.id);
  redirect(safeNext(form.get("next")));
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await checkPassword(String(form.get("password") ?? ""), user.passwordHash))) return { error: "Wrong email or password" };
  await startSession(user.id);
  redirect(safeNext(form.get("next")));
}

export async function logout() {
  await endSession();
  redirect("/");
}

export async function saveItem(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const e = entityBySlug(String(form.get("_entity")));
  if (!e) return { error: "Unknown type" };
  const id = form.get("_id") ? String(form.get("_id")) : null;
  let data: Record<string, unknown>;
  try { data = parseForm(e, form); } catch (err) { return { error: (err as Error).message }; }
  if (id) {
    const it = await getItem(e, id);
    if (!it || (it.ownerId !== user.id && user.role !== "admin")) return { error: "Not allowed" };
    await updateItem(e, id, data);
  } else {
    await createItem(e, user.id, data);
  }
  revalidatePath("/", "layout");
  redirect(`/dashboard?saved=${slugOf(e)}`);
}

export async function removeItem(form: FormData) {
  const user = await requireUser();
  const e = entityBySlug(String(form.get("_entity")));
  const id = String(form.get("_id"));
  if (!e) return;
  const it = await getItem(e, id);
  if (!it || (it.ownerId !== user.id && user.role !== "admin")) return;
  await deleteItem(e, id);
  await db.favorite.deleteMany({ where: { entity: e.name, itemId: id } });
  await db.review.deleteMany({ where: { entity: e.name, itemId: id } });
  revalidatePath("/", "layout");
}

export async function toggleFavorite(form: FormData) {
  const user = await currentUser();
  const entity = String(form.get("entity")); const itemId = String(form.get("itemId"));
  if (!user) redirect(`/login?next=${encodeURIComponent(String(form.get("back") ?? "/"))}`);
  const existing = await db.favorite.findUnique({ where: { userId_entity_itemId: { userId: user.id, entity, itemId } } });
  if (existing) await db.favorite.delete({ where: { id: existing.id } });
  else await db.favorite.create({ data: { userId: user.id, entity, itemId } });
  revalidatePath("/", "layout");
}

export async function addReview(_: FormState, form: FormData): Promise<FormState> {
  const user = await currentUser();
  if (!user) return { error: "Log in to leave a review" };
  const rating = Math.min(5, Math.max(1, Number(form.get("rating")) || 0));
  const text = String(form.get("text") ?? "").trim().slice(0, 2000);
  if (!rating) return { error: "Pick a rating" };
  await db.review.upsert({
    where: { userId_entity_itemId: { userId: user.id, entity: String(form.get("entity")), itemId: String(form.get("itemId")) } },
    create: { userId: user.id, entity: String(form.get("entity")), itemId: String(form.get("itemId")), rating, text },
    update: { rating, text },
  });
  revalidatePath("/", "layout");
  return { ok: "Thanks for your review" };
}

export async function sendContact(_: FormState, form: FormData): Promise<FormState> {
  const name = String(form.get("name") ?? "").trim(); const email = String(form.get("email") ?? "").trim(); const message = String(form.get("message") ?? "").trim();
  if (!name || !/^[^@\s]+@[^@\s]+$/.test(email) || message.length < 5) return { error: "Fill in your name, a valid email and a message" };
  await db.lead.create({ data: { name: name.slice(0, 100), email: email.slice(0, 200), phone: String(form.get("phone") ?? "").slice(0, 30) || null, message: message.slice(0, 5000) } });
  return { ok: "Thanks! We'll get back to you soon." };
}

export async function subscribe(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter a valid email" };
  await db.subscriber.upsert({ where: { email }, create: { email }, update: {} });
  return { ok: "You're subscribed" };
}

export async function setRole(form: FormData) {
  const admin = await requireAdmin();
  const id = String(form.get("id"));
  if (id === admin.id) return;
  await db.user.update({ where: { id }, data: { role: String(form.get("role")) === "admin" ? "admin" : "user" } });
  revalidatePath("/admin");
}

export async function savePost(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const title = String(form.get("title") ?? "").trim(); const body = String(form.get("body") ?? "").trim();
  if (!title || !body) return { error: "Title and body are required" };
  const slug = (String(form.get("slug") ?? "").trim() || title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
  const data = { title: title.slice(0, 200), slug, body, excerpt: body.replace(/\s+/g, " ").slice(0, 180), cover: String(form.get("cover") ?? "") || null, published: form.get("published") === "on" };
  const id = form.get("id") ? String(form.get("id")) : null;
  try {
    if (id) await db.post.update({ where: { id }, data });
    else await db.post.create({ data: { ...data, authorId: admin.id } });
  } catch { return { error: "That URL slug is already used" }; }
  revalidatePath("/blog"); revalidatePath("/admin/posts");
  redirect("/admin/posts");
}

export async function deletePost(form: FormData) {
  await requireAdmin();
  await db.post.delete({ where: { id: String(form.get("id")) } });
  revalidatePath("/blog"); revalidatePath("/admin/posts");
}

export async function deleteLead(form: FormData) {
  await requireAdmin();
  await db.lead.delete({ where: { id: String(form.get("id")) } });
  revalidatePath("/admin");
}
void cfg;
