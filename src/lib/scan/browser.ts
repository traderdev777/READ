// READ deep scan (M2): real headless Chromium. Screenshots, computed design tokens,
// network map, performance timings and a sitemap crawl.
import { chromium, type Browser, type Page } from "playwright-core";
import { normalizeUrl } from "./page";

export type DeepScan = {
  url: string;
  finalUrl: string;
  screenshots: { desktop: string; mobile: string }; // data URLs (jpeg)
  design: {
    colors: { value: string; count: number; role: "text" | "background" | "border" }[];
    fonts: { family: string; count: number }[];
    fontSizes: { size: string; count: number }[];
    radii: string[];
    buttons: { text: string; bg: string; color: string; radius: string; font: string }[];
  };
  perf: { ttfbMs: number | null; domContentLoadedMs: number | null; loadMs: number | null; lcpMs: number | null; cls: number | null; transferKB: number; requests: number };
  network: { byType: Record<string, { count: number; kb: number }>; thirdParties: string[]; apiCalls: string[] };
  features: string[];
  sitemap: { source: string; urls: string[] };
};

const CHROME = process.env.CHROMIUM_PATH || "/usr/bin/chromium";
let browserP: Promise<Browser> | null = null;
function getBrowser() {
  if (!browserP) {
    const px = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    let proxy: { server: string; username?: string; password?: string } | undefined;
    if (px) {
      const u = new URL(px);
      proxy = { server: `${u.protocol}//${u.host}`, username: decodeURIComponent(u.username) || undefined, password: decodeURIComponent(u.password) || undefined };
    }
    browserP = chromium.launch({ executablePath: CHROME, proxy, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
    browserP.catch(() => { browserP = null; });
  }
  return browserP;
}

async function shot(page: Page) {
  const buf = await page.screenshot({ type: "jpeg", quality: 60, fullPage: false });
  return `data:image/jpeg;base64,${buf.toString("base64")}`;
}

async function sitemapFor(origin: string): Promise<{ source: string; urls: string[] }> {
  const get = async (u: string) => {
    try { const r = await fetch(u, { signal: AbortSignal.timeout(8000) }); return r.ok ? await r.text() : null; } catch { return null; }
  };
  const robots = await get(`${origin}/robots.txt`);
  const declared = robots?.match(/^sitemap:\s*(\S+)/gim)?.map((l) => l.split(/:\s*/).slice(1).join(":").trim()) ?? [];
  for (const sm of [...declared, `${origin}/sitemap.xml`]) {
    const xml = await get(sm);
    if (!xml || !xml.includes("<loc>")) continue;
    let locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
    if (xml.includes("<sitemapindex") && locs[0]) {
      const child = await get(locs[0]);
      if (child) locs = [...child.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
    }
    return { source: sm, urls: locs.slice(0, 200) };
  }
  return { source: "none found", urls: [] };
}

export async function deepScan(input: string): Promise<DeepScan> {
  const url = normalizeUrl(input);
  const browser = await getBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 820 }, userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36 READ-bot/0.2" });
  const page = await ctx.newPage();
  const byType: Record<string, { count: number; kb: number }> = {};
  const third = new Set<string>();
  const api = new Set<string>();
  let transfer = 0, requests = 0;
  page.on("response", async (res) => {
    try {
      const req = res.request();
      const type = req.resourceType();
      const len = Number(res.headers()["content-length"] ?? 0);
      requests++; transfer += len;
      byType[type] ??= { count: 0, kb: 0 };
      byType[type].count++; byType[type].kb += len / 1024;
      const host = new URL(req.url()).hostname;
      if (!host.endsWith(url.hostname.replace(/^www\./, ""))) third.add(host);
      if ((type === "xhr" || type === "fetch") && api.size < 30) api.add(`${req.method()} ${req.url().split("?")[0]}`);
    } catch { /* ignore */ }
  });
  await page.addInitScript(() => {
    (window as unknown as { __lcp: number; __cls: number }).__lcp = 0;
    (window as unknown as { __cls: number }).__cls = 0;
    try {
      new PerformanceObserver((l) => { for (const e of l.getEntries()) (window as unknown as { __lcp: number }).__lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) if (!e.hadRecentInput) (window as unknown as { __cls: number }).__cls += e.value; }).observe({ type: "layout-shift", buffered: true });
    } catch { /* unsupported */ }
  });

  try {
    await page.goto(url.toString(), { waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(1500);
    const finalUrl = page.url();

    const data = await page.evaluate(() => {
      const colorMap = new Map<string, { count: number; role: "text" | "background" | "border" }>();
      const fonts = new Map<string, number>();
      const sizes = new Map<string, number>();
      const radii = new Map<string, number>();
      const add = (c: string, role: "text" | "background" | "border") => {
        if (!c || c === "rgba(0, 0, 0, 0)" || c === "transparent") return;
        const k = `${role}|${c}`;
        const v = colorMap.get(k);
        if (v) v.count++; else colorMap.set(k, { count: 1, role });
      };
      const els = Array.from(document.querySelectorAll("body *")).slice(0, 3000);
      for (const el of els) {
        const r = (el as HTMLElement).getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const cs = getComputedStyle(el);
        const hasText = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent!.trim());
        if (hasText) {
          add(cs.color, "text");
          const fam = cs.fontFamily.split(",")[0].replace(/['"]/g, "").trim();
          fonts.set(fam, (fonts.get(fam) ?? 0) + 1);
          sizes.set(cs.fontSize, (sizes.get(cs.fontSize) ?? 0) + 1);
        }
        add(cs.backgroundColor, "background");
        if (cs.borderTopWidth !== "0px" && cs.borderTopStyle !== "none") add(cs.borderTopColor, "border");
        if (cs.borderTopLeftRadius !== "0px") radii.set(cs.borderTopLeftRadius, (radii.get(cs.borderTopLeftRadius) ?? 0) + 1);
      }
      const buttons = Array.from(document.querySelectorAll("button, a[class*='btn'], a[class*='button'], [role='button']"))
        .filter((b) => (b as HTMLElement).offsetWidth > 0 && b.textContent!.trim())
        .slice(0, 6)
        .map((b) => { const cs = getComputedStyle(b); return { text: b.textContent!.trim().slice(0, 40), bg: cs.backgroundColor, color: cs.color, radius: cs.borderTopLeftRadius, font: `${cs.fontWeight} ${cs.fontSize}` }; });

      const q = (s: string) => document.querySelector(s) !== null;
      const txt = document.body.innerText.toLowerCase();
      const features: string[] = [];
      if (q("input[type='search'], [role='search'], input[name*='search' i], input[placeholder*='search' i]")) features.push("Search");
      if (q("input[type='password']") || /\b(log ?in|sign ?in)\b/.test(txt)) features.push("Login / accounts");
      if (/\b(sign ?up|register|create account)\b/.test(txt)) features.push("Sign-up");
      if (/\b(add to cart|add to bag|checkout|basket)\b/.test(txt)) features.push("Cart / checkout");
      if (/\b(pricing|per month|\/mo\b|plans)\b/.test(txt)) features.push("Pricing plans");
      if (q("select, input[type='checkbox'], input[type='range']") && /\bfilter/.test(txt)) features.push("Filters");
      if (q("form")) features.push("Forms");
      if (q("input[type='email']") || /newsletter|subscribe/.test(txt)) features.push("Email capture / newsletter");
      if (q("video, iframe[src*='youtube'], iframe[src*='vimeo']")) features.push("Video");
      if (q("[class*='carousel' i], [class*='slider' i], [class*='swiper' i]")) features.push("Carousel / slider");
      if (q("iframe[src*='maps.google'], iframe[src*='google.com/maps']")) features.push("Embedded map");
      if (q("a[href*='wa.me'], a[href*='whatsapp']")) features.push("WhatsApp contact");
      if (q("a[href^='tel:']")) features.push("Click-to-call");
      if (/\b(chat with us|live chat)\b/.test(txt) || q("[id*='intercom'], [class*='crisp'], [id*='tawk']")) features.push("Live chat");
      if (q("[class*='dark' i] , [data-theme]")) features.push("Theming / dark mode");
      if (q("[class*='review' i], [class*='testimonial' i]")) features.push("Reviews / testimonials");
      if (q("[class*='cookie' i], [id*='cookie' i]")) features.push("Cookie banner");

      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      const w = window as unknown as { __lcp: number; __cls: number };
      return {
        colors: Array.from(colorMap.entries()).map(([k, v]) => ({ value: k.split("|")[1], count: v.count, role: v.role })).sort((a, b) => b.count - a.count).slice(0, 16),
        fonts: Array.from(fonts.entries()).map(([family, count]) => ({ family, count })).sort((a, b) => b.count - a.count).slice(0, 6),
        fontSizes: Array.from(sizes.entries()).map(([size, count]) => ({ size, count })).sort((a, b) => b.count - a.count).slice(0, 8),
        radii: Array.from(radii.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([r]) => r),
        buttons,
        features,
        perf: nav ? { ttfbMs: Math.round(nav.responseStart), domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd), loadMs: Math.round(nav.loadEventEnd), lcpMs: w.__lcp ? Math.round(w.__lcp) : null, cls: Math.round(w.__cls * 1000) / 1000 } : null,
      };
    });

    const desktop = await shot(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(800);
    const mobile = await shot(page);
    const sitemap = await sitemapFor(new URL(finalUrl).origin);

    for (const k of Object.keys(byType)) byType[k].kb = Math.round(byType[k].kb);
    return {
      url: url.toString(),
      finalUrl,
      screenshots: { desktop, mobile },
      design: { colors: data.colors, fonts: data.fonts, fontSizes: data.fontSizes, radii: data.radii, buttons: data.buttons },
      perf: { ttfbMs: data.perf?.ttfbMs ?? null, domContentLoadedMs: data.perf?.domContentLoadedMs ?? null, loadMs: data.perf?.loadMs ?? null, lcpMs: data.perf?.lcpMs ?? null, cls: data.perf?.cls ?? null, transferKB: Math.round(transfer / 1024), requests },
      network: { byType, thirdParties: [...third].slice(0, 30), apiCalls: [...api] },
      features: data.features,
      sitemap,
    };
  } finally {
    await ctx.close();
  }
}
