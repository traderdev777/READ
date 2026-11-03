// Generic data access for every entity in config.json (list, filter, get, create, update, delete).
import "server-only";
import { db } from "./db";
import { cfg, modelKey, type Entity, type Field } from "./config";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Item = Record<string, any> & { id: string; ownerId: string; createdAt: Date; owner?: { name: string | null; email: string } };
const model = (e: Entity) => (db as unknown as Record<string, any>)[modelKey(e)];

export type Query = { q?: string; sort?: string; page?: number; min?: number; max?: number; filters?: Record<string, string>; ownerId?: string };
export const PAGE = 12;

export async function listItems(e: Entity, query: Query = {}) {
  const where: Record<string, any> = {};
  const and: any[] = [];
  if (query.ownerId) where.ownerId = query.ownerId;
  const textFields = e.fields.filter((f) => ["text", "longtext"].includes(f.type)).map((f) => f.name);
  if (query.q && textFields.length) and.push({ OR: textFields.map((n) => ({ [n]: { contains: query.q } })) });
  for (const f of e.fields.filter((x) => x.filter)) {
    const v = query.filters?.[f.name];
    if (!v) continue;
    if (f.type === "select") where[f.name] = v;
    else if (f.type === "text") and.push({ [f.name]: { contains: v } });
  }
  const priceField = e.fields.find((f) => f.type === "money" && f.filter);
  if (priceField && (query.min != null || query.max != null)) where[priceField.name] = { ...(query.min != null ? { gte: query.min } : {}), ...(query.max != null ? { lte: query.max } : {}) };
  if (and.length) where.AND = and;
  const orderBy = query.sort === "price_asc" && priceField ? { [priceField.name]: "asc" } : query.sort === "price_desc" && priceField ? { [priceField.name]: "desc" } : query.sort === "oldest" ? { createdAt: "asc" } : { createdAt: "desc" };
  const page = Math.max(1, query.page ?? 1);
  const [items, total] = await Promise.all([
    model(e).findMany({ where, orderBy, skip: (page - 1) * PAGE, take: PAGE, include: { owner: { select: { name: true, email: true } } } }),
    model(e).count({ where }),
  ]);
  return { items: items as Item[], total, page, pages: Math.max(1, Math.ceil(total / PAGE)) };
}

export const getItem = async (e: Entity, id: string) => (await model(e).findUnique({ where: { id }, include: { owner: { select: { name: true, email: true } } } })) as Item | null;
export const countItems = (e: Entity, where: Record<string, unknown> = {}) => model(e).count({ where }) as Promise<number>;

function parseValue(f: Field, raw: FormDataEntryValue | null): unknown {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (f.type === "bool") return raw === "on" || raw === "true";
  if (!s) return null;
  if (f.type === "number" || f.type === "money") { const n = Number(s.replace(/[,₹\s]/g, "")); if (Number.isNaN(n)) throw new Error(`${f.label} must be a number`); return n; }
  if (f.type === "date") { const d = new Date(s); if (Number.isNaN(+d)) throw new Error(`${f.label} must be a date`); return d; }
  if (f.type === "select" && f.options && !f.options.includes(s)) throw new Error(`${f.label}: pick one of the options`);
  if (f.type === "url" || f.type === "image") { if (!/^(https?:\/\/|\/uploads\/)/.test(s)) throw new Error(`${f.label} must be a link or an uploaded file`); }
  return s.slice(0, f.type === "longtext" ? 20000 : 300);
}

export function parseForm(e: Entity, form: FormData) {
  const data: Record<string, unknown> = {};
  for (const f of e.fields) {
    const v = parseValue(f, form.get(f.name));
    if (f.required && (v === null || v === "")) throw new Error(`${f.label} is required`);
    data[f.name] = v;
  }
  return data;
}

export const createItem = (e: Entity, ownerId: string, data: Record<string, unknown>) => model(e).create({ data: { ...data, ownerId } }) as Promise<Item>;
export const updateItem = (e: Entity, id: string, data: Record<string, unknown>) => model(e).update({ where: { id }, data }) as Promise<Item>;
export const deleteItem = (e: Entity, id: string) => model(e).delete({ where: { id } });

export const titleOf = (e: Entity, it: Item) => String(it[e.fields[0].name] ?? "Untitled");
export const imageOf = (e: Entity, it: Item) => { const f = e.fields.find((x) => x.type === "image"); return f ? (it[f.name] as string | null) : null; };
export const priceOf = (e: Entity, it: Item) => { const f = e.fields.find((x) => x.type === "money"); return f ? (it[f.name] as number | null) : null; };
export { cfg };
