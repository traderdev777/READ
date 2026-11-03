import { detectStack, Signal } from "./stack";

export type ScanResult = {
  url: string;
  finalUrl: string;
  status: number;
  fetchedMs: number;
  bytes: number;
  title: string | null;
  description: string | null;
  lang: string | null;
  stack: Signal[];
  meta: { ogImage: string | null; themeColor: string | null; viewport: boolean; canonical: string | null };
  structure: { headings: { level: number; text: string }[]; navLinks: { text: string; href: string }[]; forms: number; images: number; scripts: number; stylesheets: number };
  design: { colors: string[]; fonts: string[] };
  security: { https: boolean; hsts: boolean; csp: boolean };
};

const decode = (s: string) => s
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
const strip = (s: string) => decode(s.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
const attr = (tag: string, name: string) => tag.match(new RegExp(`${name}=["']([^"']*)["']`, "i"))?.[1] ?? null;

export function normalizeUrl(input: string): URL {
  const raw = input.trim();
  const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  if (!["http:", "https:"].includes(u.protocol)) throw new Error("Only http(s) links are supported");
  const h = u.hostname;
  if (h === "localhost" || /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.)/.test(h) || h.endsWith(".internal")) {
    throw new Error("Private or local addresses can't be scanned");
  }
  return u;
}

export async function scanPage(input: string): Promise<ScanResult> {
  const url = normalizeUrl(input);
  const t0 = Date.now();
  const res = await fetch(url, {
    redirect: "follow",
    headers: { "user-agent": "Mozilla/5.0 (compatible; READ-bot/0.1; +https://github.com/traderdev777/READ)", accept: "text/html,*/*" },
    signal: AbortSignal.timeout(15000),
  });
  const html = (await res.text()).slice(0, 3_000_000);
  const fetchedMs = Date.now() - t0;
  const head = html.match(/<head[\s\S]*?<\/head>/i)?.[0] ?? html;
  const metaTag = (n: string) => head.match(new RegExp(`<meta[^>]+(?:name|property)=["']${n}["'][^>]*>`, "i"))?.[0];

  const headings = [...html.matchAll(/<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi)].map((m) => ({ level: +m[1], text: strip(m[2]) })).filter((h) => h.text).slice(0, 30);
  const navHtml = html.match(/<nav[\s\S]*?<\/nav>/i)?.[0] ?? html.match(/<header[\s\S]*?<\/header>/i)?.[0] ?? "";
  const navLinks = [...navHtml.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)]
    .map((m) => ({ text: strip(m[2]), href: attr(m[1], "href") ?? "" }))
    .filter((l) => l.text && l.href).slice(0, 25);

  const css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n") + " " + [...html.matchAll(/style=["']([^"']+)["']/gi)].map((m) => m[1]).join(";");
  const colorCounts = new Map<string, number>();
  for (const m of css.matchAll(/#(?:[0-9a-f]{6}|[0-9a-f]{3})\b|rgba?\([^)]+\)/gi)) {
    const c = m[0].toLowerCase();
    colorCounts.set(c, (colorCounts.get(c) ?? 0) + 1);
  }
  const colors = [...colorCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([c]) => c);
  const fonts = new Set<string>();
  for (const m of css.matchAll(/font-family\s*:\s*([^;}"]+)/gi)) {
    const f = m[1].split(",")[0].replace(/['"]/g, "").trim();
    if (f && !f.startsWith("var(") && !/^(inherit|initial)$/i.test(f)) fonts.add(f);
  }
  for (const m of html.matchAll(/fonts\.googleapis\.com\/css2?\?([^"']+)/gi)) {
    for (const fm of m[1].matchAll(/family=([^&:]+)/g)) fonts.add(decodeURIComponent(fm[1]).replace(/\+/g, " "));
  }

  return {
    url: url.toString(),
    finalUrl: res.url,
    status: res.status,
    fetchedMs,
    bytes: html.length,
    title: strip(head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "") || null,
    description: (metaTag("description") && attr(metaTag("description")!, "content")) || null,
    lang: html.match(/<html[^>]+lang=["']([^"']+)/i)?.[1] ?? null,
    stack: detectStack(html, res.headers),
    meta: {
      ogImage: (metaTag("og:image") && attr(metaTag("og:image")!, "content")) || null,
      themeColor: (metaTag("theme-color") && attr(metaTag("theme-color")!, "content")) || null,
      viewport: !!metaTag("viewport"),
      canonical: attr(head.match(/<link[^>]+rel=["']canonical["'][^>]*>/i)?.[0] ?? "", "href"),
    },
    structure: {
      headings,
      navLinks,
      forms: (html.match(/<form\b/gi) ?? []).length,
      images: (html.match(/<img\b/gi) ?? []).length,
      scripts: (html.match(/<script\b/gi) ?? []).length,
      stylesheets: (html.match(/<link[^>]+rel=["']stylesheet/gi) ?? []).length,
    },
    design: { colors, fonts: [...fonts].slice(0, 8) },
    security: {
      https: res.url.startsWith("https://"),
      hsts: res.headers.has("strict-transport-security"),
      csp: res.headers.has("content-security-policy"),
    },
  };
}
