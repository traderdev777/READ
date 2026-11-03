// Sitemap discovery: robots.txt -> sitemap(s) -> URLs, grouped into page templates.
import { normalizeUrl } from "./page";

export type SitemapResult = {
  source: "sitemap" | "links" | "none";
  sitemaps: string[];
  total: number;
  urls: string[];
  templates: { pattern: string; count: number; example: string }[];
  robots: { found: boolean; disallow: string[] };
};

const UA = { "user-agent": "Mozilla/5.0 (compatible; READ-bot/0.2; +https://github.com/traderdev777/READ)" };
const get = async (u: string) => {
  try {
    const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(8000), redirect: "follow" });
    return r.ok ? await r.text() : null;
  } catch { return null; }
};
const locs = (xml: string) => [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1].replace(/&amp;/g, "&"));

export function templateOf(path: string) {
  return path.split("/").map((seg) => {
    if (!seg) return seg;
    if (/^\d+$/.test(seg)) return ":id";
    if (/^[0-9a-f-]{16,}$/i.test(seg)) return ":uuid";
    if (/^\d{4}$/.test(seg)) return ":year";
    if (seg.length > 24 || /-.*-.*-/.test(seg)) return ":slug";
    return seg;
  }).join("/") || "/";
}

export async function discoverSitemap(input: string, fallbackLinks: string[] = []): Promise<SitemapResult> {
  const base = normalizeUrl(input);
  const origin = base.origin;
  const robotsTxt = await get(`${origin}/robots.txt`);
  const disallow = robotsTxt ? [...robotsTxt.matchAll(/^disallow:\s*(\S+)/gim)].map((m) => m[1]).slice(0, 20) : [];
  let sitemaps = robotsTxt ? [...robotsTxt.matchAll(/^sitemap:\s*(\S+)/gim)].map((m) => m[1]) : [];
  if (!sitemaps.length) sitemaps = [`${origin}/sitemap.xml`];

  const urls = new Set<string>();
  const seen = new Set<string>();
  const queue = [...sitemaps];
  while (queue.length && seen.size < 6 && urls.size < 2000) {
    const sm = queue.shift()!;
    if (seen.has(sm)) continue;
    seen.add(sm);
    const xml = await get(sm);
    if (!xml) continue;
    if (/<sitemapindex/i.test(xml)) queue.push(...locs(xml).slice(0, 10));
    else for (const l of locs(xml)) urls.add(l);
  }

  let source: SitemapResult["source"] = urls.size ? "sitemap" : "none";
  if (!urls.size && fallbackLinks.length) {
    source = "links";
    for (const p of fallbackLinks) { try { urls.add(new URL(p, origin).toString()); } catch { /* skip */ } }
  }

  const tmpl = new Map<string, { count: number; example: string }>();
  for (const u of urls) {
    try {
      const p = templateOf(new URL(u).pathname);
      const t = tmpl.get(p) ?? { count: 0, example: u };
      t.count++; tmpl.set(p, t);
    } catch { /* skip */ }
  }
  const all = [...urls];
  return {
    source,
    sitemaps: [...seen],
    total: all.length,
    urls: all.slice(0, 200),
    templates: [...tmpl.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 25).map(([pattern, v]) => ({ pattern, ...v })),
    robots: { found: !!robotsTxt, disallow },
  };
}
