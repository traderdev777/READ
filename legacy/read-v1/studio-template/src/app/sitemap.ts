import type { MetadataRoute } from "next";
import { cfg, publicEntities, slugOf, siteUrl } from "@/lib/config";
import { listItems } from "@/lib/items";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const urls: MetadataRoute.Sitemap = [{ url: base }, ...(cfg.features.contact ? [{ url: `${base}/contact` }] : []), ...(cfg.features.payments !== "none" ? [{ url: `${base}/pricing` }] : [])];
  for (const e of publicEntities()) {
    urls.push({ url: `${base}/browse/${slugOf(e)}` });
    const { items } = await listItems(e, { page: 1 });
    for (const it of items) urls.push({ url: `${base}/browse/${slugOf(e)}/${it.id}`, lastModified: it.updatedAt ?? it.createdAt });
  }
  if (cfg.features.blog) for (const p of await db.post.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } })) urls.push({ url: `${base}/blog/${p.slug}`, lastModified: p.updatedAt });
  return urls;
}
