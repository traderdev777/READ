// READ deep scan: one real headless-Chromium visit (desktop) + one phone visit.
// Captures what a plain fetch can't: rendered design tokens, every network request,
// speed metrics, JS/CSS coverage, SEO, images, accessibility, cookies, security headers.
import { chromium, type Browser, type Page } from "playwright-core";
import { normalizeUrl } from "./page";

export type Req = { url: string; host: string; type: string; method: string; status: number | null; kb: number; ms: number | null; mime: string | null; cache: string | null; encoding: string | null; thirdParty: boolean };

export type DeepScan = {
  url: string;
  finalUrl: string;
  title: string;
  scannedAt: string;
  screenshots: { desktop: string; mobile: string; full: string };
  response: { status: number | null; headers: Record<string, string>; httpVersion: string | null; redirects: string[] };
  design: {
    colors: { value: string; hex: string; count: number; role: "text" | "background" | "border" }[];
    fonts: { family: string; count: number }[];
    fontsLoaded: { family: string; weight: string; style: string; status: string }[];
    fontSizes: { size: string; count: number }[];
    lineHeights: string[];
    spacing: { value: string; count: number }[];
    radii: { value: string; count: number }[];
    shadows: { value: string; count: number }[];
    headingFont: string | null;
    bodyFont: string | null;
    buttons: { text: string; bg: string; color: string; radius: string; padding: string; font: string }[];
    cssVariables: { name: string; value: string }[];
    breakpoints: string[];
  };
  layout: { sections: { tag: string; id: string | null; heading: string | null; height: number }[]; pageHeight: number; stickyHeader: boolean; domNodes: number; domDepth: number; iframes: number };
  content: { wordCount: number; readingMin: number; headings: { level: number; text: string }[]; h1Count: number; paragraphs: number; lists: number; tables: number; forms: { action: string | null; method: string; fields: string[] }[]; ctas: string[] };
  links: { internal: number; external: number; nofollow: number; mailto: number; tel: number; externalHosts: { host: string; count: number }[]; social: string[] };
  seo: {
    title: string; titleLength: number; description: string | null; descriptionLength: number;
    canonical: string | null; robotsMeta: string | null; viewport: string | null; charset: string | null; lang: string | null;
    hreflang: string[]; favicon: string | null; appleTouchIcon: boolean; manifest: boolean; themeColor: string | null;
    og: Record<string, string>; twitter: Record<string, string>; jsonLdTypes: string[]; microdata: number;
  };
  images: { count: number; withoutAlt: number; lazy: number; withoutSize: number; formats: Record<string, number>; totalKB: number; oversized: { src: string; natural: string; shown: string }[]; largest: { src: string; kb: number }[] };
  a11y: { imagesWithoutAlt: number; inputsWithoutLabel: number; buttonsWithoutName: number; linksWithoutText: number; headingSkips: number; landmarks: string[]; tabindexPositive: number; lowContrast: { text: string; ratio: number }[]; lang: string | null; smallTapTargets: number; mobileHorizontalScroll: boolean };
  features: { name: string; found: boolean }[];
  network: {
    requests: number; transferKB: number; failed: { url: string; status: number | null }[];
    byType: Record<string, { count: number; kb: number }>;
    thirdParty: { host: string; count: number; kb: number; category: string }[];
    apiCalls: { method: string; url: string; status: number | null; mime: string | null }[];
    heaviest: { url: string; type: string; kb: number }[];
    slowest: { url: string; type: string; ms: number }[];
    uncompressed: string[]; noCache: string[];
    protocols: Record<string, number>;
  };
  coverage: { jsKB: number; jsUnusedKB: number; cssKB: number; cssUnusedKB: number; files: { url: string; type: "js" | "css"; kb: number; unusedPct: number }[] };
  speed: { ttfbMs: number | null; fcpMs: number | null; lcpMs: number | null; lcpElement: string | null; cls: number | null; tbtMs: number; longTasks: number; domContentLoadedMs: number | null; loadMs: number | null; mobileLoadMs: number | null; mobileLcpMs: number | null };
  storage: { cookies: { name: string; domain: string; secure: boolean; httpOnly: boolean; sameSite: string; thirdParty: boolean; expiresDays: number | null }[]; localStorageKeys: number; sessionStorageKeys: number; serviceWorker: boolean };
  runtime: { name: string; version: string | null }[];
  consoleErrors: string[];
  pageErrors: string[];
};

const TP_CATEGORIES: [RegExp, string][] = [
  [/google-analytics|googletagmanager|analytics\.google|segment|mixpanel|amplitude|hotjar|clarity\.ms|plausible|posthog|heap|fullstory|matomo/, "Analytics"],
  [/doubleclick|googlesyndication|adservice|facebook\.net|connect\.facebook|ads\.|taboola|outbrain|criteo|adnxs|bing\.com\/bat|linkedin|snap\.|tiktok/, "Advertising / pixels"],
  [/fonts\.googleapis|fonts\.gstatic|typekit|use\.fontawesome|fonts\./, "Fonts"],
  [/cloudflare|cloudfront|fastly|akamai|jsdelivr|unpkg|cdnjs|bunny|vercel|netlify|githubusercontent/, "CDN / hosting"],
  [/stripe|razorpay|paypal|braintree|checkout|paytm|cashfree/, "Payments"],
  [/intercom|drift|crisp|tawk|zendesk|freshchat|hubspot|olark|livechat/, "Chat / CRM"],
  [/youtube|ytimg|vimeo|wistia|jwplayer/, "Video"],
  [/sentry|bugsnag|datadog|newrelic|logrocket|rollbar/, "Monitoring"],
  [/recaptcha|hcaptcha|turnstile/, "Bot protection"],
  [/maps\.googleapis|mapbox|maps\.gstatic/, "Maps"],
  [/onetrust|cookiebot|cookielaw|usercentrics|termly/, "Consent"],
  [/gstatic|googleapis|google\.com/, "Google services"],
  [/firebase|supabase|algolia|contentful|sanity|shopify|wix|squarespace/, "Backend / SaaS"],
];
const tpCategory = (h: string) => TP_CATEGORIES.find(([r]) => r.test(h))?.[1] ?? "Other";

let browserPromise: Promise<Browser> | null = null;
function getBrowser() {
  if (!browserPromise) {
    const px = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    let proxy: { server: string; username?: string; password?: string } | undefined;
    if (px) {
      const u = new URL(px);
      proxy = { server: `${u.protocol}//${u.host}`, username: decodeURIComponent(u.username) || undefined, password: decodeURIComponent(u.password) || undefined };
    }
    browserPromise = chromium.launch({
      executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
      proxy,
      args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    }).catch((e) => { browserPromise = null; throw e; });
  }
  return browserPromise;
}

const UA_DESKTOP = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0 Safari/537.36 READ/0.3";
const UA_MOBILE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1 READ/0.3";
const jpeg = (b: Buffer) => `data:image/jpeg;base64,${b.toString("base64")}`;
const short = (u: string, n = 140) => (u.length > n ? u.slice(0, n) + "…" : u);

const INIT = () => {
  const w = window as unknown as { __read: { lcp: number | null; lcpEl: string | null; cls: number; tbt: number; long: number } };
  w.__read = { lcp: null, lcpEl: null, cls: 0, tbt: 0, long: 0 };
  try {
    new PerformanceObserver((l) => {
      const e = l.getEntries();
      const last = e[e.length - 1] as PerformanceEntry & { element?: Element; url?: string };
      w.__read.lcp = last.startTime;
      const el = last.element;
      w.__read.lcpEl = el ? `<${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : ""}>${last.url ? " " + last.url.slice(0, 80) : ""}` : null;
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) if (!e.hadRecentInput) w.__read.cls += e.value; }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) { // Lighthouse-style window: FCP until ~10 s, before READ starts scrolling.
      if (e.startTime > 10000 || (window as unknown as { __readScroll?: boolean }).__readScroll) continue; w.__read.long++; w.__read.tbt += Math.max(0, e.duration - 50); } }).observe({ type: "longtask", buffered: true });
  } catch { /* unsupported */ }
};

async function settle(page: Page) {
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  await page.evaluate(async () => {
    (window as unknown as { __readScroll?: boolean }).__readScroll = true;
    for (let y = 0; y < Math.min(document.body.scrollHeight, 8000); y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 100)); }
    window.scrollTo(0, 0);
  }).catch(() => {});
  await page.waitForTimeout(500);
}

export async function deepScan(input: string): Promise<DeepScan> {
  const url = normalizeUrl(input);
  const browser = await getBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 860 }, userAgent: UA_DESKTOP, ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  const siteHost = url.hostname.replace(/^www\./, "");
  const consoleErrors: string[] = [], pageErrors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error" && consoleErrors.length < 20) consoleErrors.push(short(m.text(), 220)); });
  page.on("pageerror", (e) => { if (pageErrors.length < 10) pageErrors.push(short(e.message, 220)); });

  const reqs: Req[] = [];
  const failed: { url: string; status: number | null }[] = [];
  const protocols: Record<string, number> = {};
  page.on("requestfailed", (r) => { if (failed.length < 30) failed.push({ url: short(r.url()), status: null }); });
  page.on("requestfinished", async (req) => {
    try {
      const res = await req.response();
      const sizes = await req.sizes().catch(() => null);
      const timing = req.timing();
      const h = res ? await res.allHeaders().catch(() => res.headers()) : {};
      const host = new URL(req.url()).hostname;
      const status = res?.status() ?? null;
      if (status && status >= 400 && failed.length < 30) failed.push({ url: short(req.url()), status });
      reqs.push({
        url: req.url(), host, type: req.resourceType(), method: req.method(), status,
        kb: sizes ? (sizes.responseBodySize + sizes.responseHeadersSize) / 1024 : 0,
        ms: timing.responseEnd > 0 ? Math.round(timing.responseEnd) : null,
        mime: h["content-type"]?.split(";")[0] ?? null, cache: h["cache-control"] ?? null, encoding: h["content-encoding"] ?? null,
        thirdParty: !host.endsWith(siteHost),
      });
    } catch { /* ignore */ }
  });

  await page.addInitScript(INIT);
  await page.coverage.startJSCoverage({ resetOnNavigation: false }).catch(() => {});
  await page.coverage.startCSSCoverage({ resetOnNavigation: false }).catch(() => {});

  try {
    const mainRes = await page.goto(url.toString(), { waitUntil: "domcontentloaded", timeout: 30000 });
    await settle(page);

    // Main document response details.
    const redirects: string[] = [];
    let r = mainRes?.request().redirectedFrom();
    while (r) { redirects.unshift(r.url()); r = r.redirectedFrom(); }
    const mainHeaders = mainRes ? await mainRes.allHeaders().catch(() => mainRes.headers()) : {};
    const httpVersion = mainRes ? await mainRes.headerValue(":status").then(() => "h2").catch(() => null) : null;

    const [jsCov, cssCov] = await Promise.all([
      page.coverage.stopJSCoverage().catch(() => []),
      page.coverage.stopCSSCoverage().catch(() => []),
    ]);

    const desktop = await page.screenshot({ type: "jpeg", quality: 60 });
    const fullH = await page.evaluate(() => document.documentElement.scrollHeight);
    const full = await page.screenshot({ type: "jpeg", quality: 40, fullPage: true, clip: { x: 0, y: 0, width: 1366, height: Math.min(fullH, 6000) } });

    const data = await page.evaluate(() => {
      const visible = (el: Element) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && s.opacity !== "0"; };
      const all = Array.from(document.querySelectorAll("body *"));
      const els = all.filter(visible).slice(0, 5000);
      const tally = (m: Map<string, number>, k: string) => { if (k) m.set(k, (m.get(k) ?? 0) + 1); };
      const top = (m: Map<string, number>, n: number) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
      const hex = (c: string) => { const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/); return m ? "#" + [m[1], m[2], m[3]].map((x) => (+x).toString(16).padStart(2, "0")).join("") : c; };
      const lum = (c: string) => { const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/); if (!m) return null; const [r, g, b] = [m[1], m[2], m[3]].map((v) => { const x = +v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
      const bgOf = (el: Element | null): string => { while (el) { const b = getComputedStyle(el).backgroundColor; if (b && b !== "rgba(0, 0, 0, 0)" && b !== "transparent") return b; el = el.parentElement; } return "rgb(255, 255, 255)"; };

      const text = new Map<string, number>(), bg = new Map<string, number>(), border = new Map<string, number>();
      const fonts = new Map<string, number>(), sizes = new Map<string, number>(), lh = new Map<string, number>(), radii = new Map<string, number>(), shadows = new Map<string, number>(), spacing = new Map<string, number>();
      const lowContrast: { text: string; ratio: number }[] = [];
      for (const el of els) {
        const s = getComputedStyle(el);
        const ownText = Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent!.trim()).join(" ").trim();
        if (ownText) {
          tally(text, s.color); tally(fonts, s.fontFamily.split(",")[0].replace(/["']/g, "").trim()); tally(sizes, s.fontSize); tally(lh, s.lineHeight);
          if (lowContrast.length < 8 && ownText.length > 2) {
            const a = lum(s.color), b = lum(bgOf(el));
            if (a != null && b != null) {
              const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
              const large = parseFloat(s.fontSize) >= 24 || (parseFloat(s.fontSize) >= 18.66 && +s.fontWeight >= 700);
              if (ratio < (large ? 3 : 4.5)) lowContrast.push({ text: ownText.slice(0, 50), ratio: Math.round(ratio * 100) / 100 });
            }
          }
        }
        if (s.backgroundColor !== "rgba(0, 0, 0, 0)" && s.backgroundColor !== "transparent") tally(bg, s.backgroundColor);
        if (s.borderTopWidth !== "0px" && s.borderTopStyle !== "none") tally(border, s.borderTopColor);
        if (s.borderTopLeftRadius !== "0px") tally(radii, s.borderTopLeftRadius);
        if (s.boxShadow !== "none") tally(shadows, s.boxShadow.slice(0, 80));
        for (const p of [s.paddingTop, s.paddingLeft, s.marginTop, s.marginBottom, s.gap]) if (p && p !== "0px" && p !== "normal" && p !== "auto") tally(spacing, p);
      }

      // CSS variables and media-query breakpoints from same-origin stylesheets.
      const vars = new Map<string, string>(); const bps = new Set<string>();
      for (const sh of Array.from(document.styleSheets)) {
        let rules: CSSRuleList | null = null;
        try { rules = sh.cssRules; } catch { continue; }
        for (const rule of Array.from(rules ?? [])) {
          if (rule instanceof CSSStyleRule && (rule.selectorText === ":root" || rule.selectorText === "html")) {
            for (let i = 0; i < rule.style.length && vars.size < 60; i++) { const n = rule.style[i]; if (n.startsWith("--")) vars.set(n, rule.style.getPropertyValue(n).trim()); }
          }
          if (rule instanceof CSSMediaRule) { const m = rule.conditionText.match(/(min|max)-width:\s*([\d.]+(px|em|rem))/); if (m) bps.add(`${m[1]} ${m[2]}`); }
        }
      }

      const fam = (sel: string) => { const e = document.querySelector(sel); return e ? getComputedStyle(e).fontFamily.split(",")[0].replace(/["']/g, "").trim() : null; };
      const buttons = Array.from(document.querySelectorAll("button, a, [role=button], input[type=submit]")).filter(visible).filter((b) => {
        const s = getComputedStyle(b); const t = (b.textContent || (b as HTMLInputElement).value || "").trim();
        return t.length > 1 && t.length < 40 && ((s.backgroundColor !== "rgba(0, 0, 0, 0)" && s.backgroundColor !== "transparent") || s.borderTopStyle !== "none");
      }).slice(0, 8).map((b) => { const s = getComputedStyle(b); return { text: (b.textContent || (b as HTMLInputElement).value || "").trim().slice(0, 40), bg: s.backgroundColor, color: s.color, radius: s.borderTopLeftRadius, padding: s.padding, font: `${s.fontWeight} ${s.fontSize}` }; });

      const fontsLoaded: { family: string; weight: string; style: string; status: string }[] = [];
      try { (document as unknown as { fonts: Iterable<FontFace> }).fonts && Array.from((document as unknown as { fonts: Iterable<FontFace> }).fonts).slice(0, 30).forEach((f) => fontsLoaded.push({ family: f.family.replace(/["']/g, ""), weight: f.weight, style: f.style, status: f.status })); } catch { /* */ }

      // Layout
      const sections = Array.from(document.querySelectorAll("header, nav, main > *, body > *, section, footer, [role=banner], [role=contentinfo]")).filter(visible)
        .map((e) => ({ tag: e.tagName.toLowerCase(), id: e.id || null, heading: e.querySelector("h1,h2,h3")?.textContent?.trim().replace(/\s+/g, " ").slice(0, 80) ?? null, height: Math.round(e.getBoundingClientRect().height) }))
        .filter((s, i, a) => s.height > 60 && a.findIndex((x) => x.heading === s.heading && x.tag === s.tag && x.height === s.height) === i).slice(0, 30);
      const hdr = document.querySelector("header, [role=banner]");
      let depth = 0; const walk = (n: Element, d: number) => { if (d > depth) depth = d; for (const c of Array.from(n.children)) walk(c, d + 1); }; walk(document.documentElement, 1);

      // Content
      const bodyText = document.body.innerText || "";
      const words = bodyText.split(/\s+/).filter(Boolean).length;
      const headings = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6")).filter(visible).map((h) => ({ level: +h.tagName[1], text: (h.textContent || "").trim().replace(/\s+/g, " ").slice(0, 120) })).filter((h) => h.text).slice(0, 60);
      let skips = 0; for (let i = 1; i < headings.length; i++) if (headings[i].level - headings[i - 1].level > 1) skips++;
      const forms = Array.from(document.querySelectorAll("form")).slice(0, 10).map((f) => ({ action: f.getAttribute("action"), method: (f.getAttribute("method") || "get").toUpperCase(), fields: Array.from(f.querySelectorAll("input:not([type=hidden]), select, textarea")).map((i) => (i.getAttribute("name") || i.getAttribute("type") || i.tagName.toLowerCase())).slice(0, 12) }));
      const ctas = buttons.map((b) => b.text);

      // Links
      const anchors = Array.from(document.querySelectorAll("a[href]")) as HTMLAnchorElement[];
      let internal = 0, external = 0, nofollow = 0, mailto = 0, tel = 0; const extHosts = new Map<string, number>(); const social = new Set<string>();
      for (const a of anchors) {
        const href = a.getAttribute("href") || "";
        if (href.startsWith("mailto:")) { mailto++; continue; }
        if (href.startsWith("tel:")) { tel++; continue; }
        if (/nofollow/.test(a.rel)) nofollow++;
        try {
          const u = new URL(a.href);
          if (u.hostname === location.hostname) internal++; else { external++; tally(extHosts, u.hostname); }
          const sm = u.hostname.match(/(facebook|instagram|twitter|x|linkedin|youtube|tiktok|github|pinterest|threads|discord|t)\.(com|me)$/);
          if (sm) social.add(sm[1] === "t" ? "telegram" : sm[1]);
        } catch { /* */ }
      }

      // SEO
      const meta = (sel: string) => document.querySelector(sel)?.getAttribute("content") ?? null;
      const og: Record<string, string> = {}, tw: Record<string, string> = {};
      document.querySelectorAll('meta[property^="og:"]').forEach((m) => { og[m.getAttribute("property")!.slice(3)] = (m.getAttribute("content") || "").slice(0, 160); });
      document.querySelectorAll('meta[name^="twitter:"]').forEach((m) => { tw[m.getAttribute("name")!.slice(8)] = (m.getAttribute("content") || "").slice(0, 160); });
      const ld = new Set<string>();
      document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
        try { const j = JSON.parse(s.textContent || ""); const add = (o: unknown) => { if (Array.isArray(o)) o.forEach(add); else if (o && typeof o === "object") { const t = (o as Record<string, unknown>)["@type"]; if (t) (Array.isArray(t) ? t : [t]).forEach((x) => ld.add(String(x))); const g = (o as Record<string, unknown>)["@graph"]; if (g) add(g); } }; add(j); } catch { ld.add("(invalid JSON-LD)"); }
      });
      const desc = meta('meta[name="description"]');

      // Images
      const imgs = Array.from(document.images);
      const formats: Record<string, number> = {};
      const oversized: { src: string; natural: string; shown: string }[] = [];
      for (const i of imgs) {
        const src = i.currentSrc || i.src;
        const ext = (src.match(/\.(avif|webp|png|jpe?g|gif|svg)(\?|$)/i)?.[1] || (src.startsWith("data:") ? "inline" : "other")).toLowerCase().replace("jpeg", "jpg");
        formats[ext] = (formats[ext] ?? 0) + 1;
        const r = i.getBoundingClientRect();
        if (r.width > 0 && i.naturalWidth > r.width * 2.5 && i.naturalWidth > 600 && oversized.length < 8) oversized.push({ src: src.slice(0, 120), natural: `${i.naturalWidth}×${i.naturalHeight}`, shown: `${Math.round(r.width)}×${Math.round(r.height)}` });
      }

      // A11y
      const landmarks = ["header", "nav", "main", "footer", "aside", "[role=search]"].filter((s) => document.querySelector(s)).map((s) => s.replace(/[[\]]/g, ""));
      const named = (b: Element) => (b.textContent || "").trim() || b.getAttribute("aria-label") || b.getAttribute("aria-labelledby") || b.getAttribute("title") || b.querySelector("img[alt]:not([alt=''])") || b.querySelector("svg title");

      // Features
      const q = (sel: string) => !!document.querySelector(sel);
      const html = document.documentElement.innerHTML.toLowerCase();
      const lt = (re: RegExp) => anchors.some((a) => re.test(`${a.textContent} ${a.getAttribute("aria-label") || ""} ${a.getAttribute("href")}`)) || Array.from(document.querySelectorAll("button")).some((b) => re.test(`${b.textContent} ${b.getAttribute("aria-label") || ""}`));
      const features = [
        { name: "Search", found: q("input[type=search], [role=search], input[name*=search i], input[placeholder*=search i]") },
        { name: "Login / account", found: lt(/log ?in|sign ?in|my account|my profile|dashboard/i) || q("input[type=password]") },
        { name: "Sign up", found: lt(/sign ?up|register|create account|get started|join/i) },
        { name: "Cart / checkout", found: lt(/\bcart\b|basket|checkout|\bbag\b/i) },
        { name: "Pricing", found: lt(/pricing|plans/i) || /₹|\$\d|€\d|per month|\/mo\b/.test(html) },
        { name: "Filters / sorting", found: q("select, [role=listbox], input[type=range]") || lt(/filter|sort by/i) },
        { name: "Email capture", found: q("input[type=email]") },
        { name: "Contact form", found: Array.from(document.querySelectorAll("form")).some((f) => f.querySelector("textarea")) },
        { name: "Video", found: q("video, iframe[src*=youtube], iframe[src*=vimeo]") },
        { name: "Carousel / slider", found: /swiper|carousel|slick|splide|embla|glide/.test(html) },
        { name: "Live chat", found: /intercom|drift|crisp|tawk|zendesk|freshchat|hubspot-messages|livechat/.test(html) },
        { name: "WhatsApp", found: /wa\.me|api\.whatsapp|whatsapp/.test(html) },
        { name: "Click-to-call", found: q("a[href^='tel:']") },
        { name: "Cookie consent", found: /cookie(-| )?(consent|banner|notice|policy)|onetrust|cookiebot/.test(html) },
        { name: "Dark mode", found: lt(/dark|theme/i) || q("[data-theme]") },
        { name: "Language switcher", found: q("link[hreflang], select[name*=lang i]") || lt(/\b(english|हिन्दी|language|español|français)\b/i) },
        { name: "Maps", found: /maps\.google|google\.com\/maps|mapbox|leaflet/.test(html) },
        { name: "Reviews / testimonials", found: /testimonial|review|rating/.test(html) },
        { name: "FAQ / accordion", found: q("details") || /faq/.test(html) },
        { name: "Blog / articles", found: lt(/\bblog\b|articles|news|insights/i) || q("article") },
        { name: "Social links", found: social.size > 0 },
        { name: "PWA / installable", found: q('link[rel="manifest"]') },
        { name: "Calculator / tool", found: /calculator|estimate|emi/.test(html) },
        { name: "Wishlist / favourites", found: lt(/wishlist|favourite|favorite|saved/i) },
        { name: "Notifications / bell", found: lt(/notification/i) },
      ];

      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      const fcp = performance.getEntriesByName("first-contentful-paint")[0];
      const rr = (window as unknown as { __read: { lcp: number | null; lcpEl: string | null; cls: number; tbt: number; long: number } }).__read;
      let ls = 0, ss = 0; try { ls = localStorage.length; ss = sessionStorage.length; } catch { /* */ }

      return {
        title: document.title,
        design: {
          colors: [...top(text, 8).map(([v, c]) => ({ value: v, hex: hex(v), count: c, role: "text" as const })), ...top(bg, 8).map(([v, c]) => ({ value: v, hex: hex(v), count: c, role: "background" as const })), ...top(border, 4).map(([v, c]) => ({ value: v, hex: hex(v), count: c, role: "border" as const }))],
          fonts: top(fonts, 6).map(([family, count]) => ({ family, count })),
          fontsLoaded,
          fontSizes: top(sizes, 10).map(([size, count]) => ({ size, count })),
          lineHeights: top(lh, 5).map(([v]) => v),
          spacing: top(spacing, 10).map(([value, count]) => ({ value, count })),
          radii: top(radii, 6).map(([value, count]) => ({ value, count })),
          shadows: top(shadows, 4).map(([value, count]) => ({ value, count })),
          headingFont: fam("h1") ?? fam("h2"), bodyFont: fam("p") ?? fam("body"),
          buttons, cssVariables: [...vars.entries()].map(([name, value]) => ({ name, value: value.slice(0, 60) })),
          breakpoints: [...bps].sort((a, b) => parseFloat(a.split(" ")[1]) - parseFloat(b.split(" ")[1])).slice(0, 12),
        },
        layout: { sections, pageHeight: document.documentElement.scrollHeight, stickyHeader: !!hdr && ["sticky", "fixed"].includes(getComputedStyle(hdr).position), domNodes: all.length, domDepth: depth, iframes: document.querySelectorAll("iframe").length },
        content: { wordCount: words, readingMin: Math.max(1, Math.round(words / 225)), headings, h1Count: document.querySelectorAll("h1").length, paragraphs: document.querySelectorAll("p").length, lists: document.querySelectorAll("ul,ol").length, tables: document.querySelectorAll("table").length, forms, ctas },
        links: { internal, external, nofollow, mailto, tel, externalHosts: top(extHosts, 12).map(([host, count]) => ({ host, count })), social: [...social] },
        seo: {
          title: document.title, titleLength: document.title.length, description: desc, descriptionLength: desc?.length ?? 0,
          canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null,
          robotsMeta: meta('meta[name="robots"]'), viewport: meta('meta[name="viewport"]'),
          charset: document.characterSet, lang: document.documentElement.getAttribute("lang"),
          hreflang: Array.from(document.querySelectorAll("link[hreflang]")).map((l) => l.getAttribute("hreflang")!).slice(0, 20),
          favicon: document.querySelector('link[rel~="icon"]')?.getAttribute("href") ?? null,
          appleTouchIcon: q('link[rel="apple-touch-icon"]'), manifest: q('link[rel="manifest"]'), themeColor: meta('meta[name="theme-color"]'),
          og, twitter: tw, jsonLdTypes: [...ld], microdata: document.querySelectorAll("[itemscope]").length,
        },
        images: { count: imgs.length, withoutAlt: imgs.filter((i) => !i.hasAttribute("alt")).length, lazy: imgs.filter((i) => i.loading === "lazy").length, withoutSize: imgs.filter((i) => !i.getAttribute("width") || !i.getAttribute("height")).length, formats, oversized },
        a11y: {
          imagesWithoutAlt: imgs.filter((i) => !i.hasAttribute("alt")).length,
          inputsWithoutLabel: Array.from(document.querySelectorAll("input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea")).filter((i) => !i.getAttribute("aria-label") && !i.getAttribute("aria-labelledby") && !(i.id && document.querySelector(`label[for="${CSS.escape(i.id)}"]`)) && !i.closest("label")).length,
          buttonsWithoutName: Array.from(document.querySelectorAll("button, [role=button]")).filter((b) => !named(b)).length,
          linksWithoutText: anchors.filter((a) => !named(a)).length,
          headingSkips: skips, landmarks, tabindexPositive: document.querySelectorAll("[tabindex]:not([tabindex='0']):not([tabindex='-1'])").length,
          lowContrast, lang: document.documentElement.getAttribute("lang"),
        },
        features,
        speed: {
          ttfbMs: nav ? Math.round(nav.responseStart - nav.startTime) : null, fcpMs: fcp ? Math.round(fcp.startTime) : null,
          lcpMs: rr?.lcp != null ? Math.round(rr.lcp) : null, lcpElement: rr?.lcpEl ?? null, cls: rr ? Math.round(rr.cls * 1000) / 1000 : null,
          tbtMs: rr ? Math.round(rr.tbt) : 0, longTasks: rr?.long ?? 0,
          domContentLoadedMs: nav ? Math.round(nav.domContentLoadedEventEnd) : null, loadMs: nav && nav.loadEventEnd ? Math.round(nav.loadEventEnd) : null,
        },
        storage: { localStorageKeys: ls, sessionStorageKeys: ss, serviceWorker: !!navigator.serviceWorker?.controller },
      };
    });

    const runtime = await page.evaluate(() => {
      const w = window as unknown as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
      const out: { name: string; version: string | null }[] = [];
      const add = (name: string, ok: unknown, version?: unknown) => { if (ok) out.push({ name, version: version ? String(version) : null }); };
      const q = (s: string) => !!document.querySelector(s);
      add("Next.js", w.__NEXT_DATA__ || w.next || q("script[src*='/_next/']"), w.next?.version);
      add("React", w.React || q("[data-reactroot]") || Array.from(document.querySelectorAll("body *")).slice(0, 300).some((e) => Object.keys(e).some((k) => k.startsWith("__react"))), w.React?.version);
      add("Vue", w.Vue || w.__VUE__ || q("[data-v-app]"), w.Vue?.version);
      add("Nuxt", w.__NUXT__ || w.$nuxt);
      add("Angular", q("[ng-version]"), document.querySelector("[ng-version]")?.getAttribute("ng-version"));
      add("Svelte", q("[class*='svelte-']"));
      add("Astro", q("astro-island, [data-astro-cid]"));
      add("Gatsby", w.___gatsby || q("#___gatsby"));
      add("Remix", w.__remixContext);
      add("jQuery", w.jQuery, w.jQuery?.fn?.jquery);
      add("Alpine.js", w.Alpine, w.Alpine?.version);
      add("htmx", w.htmx, w.htmx?.version);
      add("GSAP", w.gsap, w.gsap?.version);
      add("Three.js", w.THREE, w.THREE?.REVISION);
      add("Lodash", w._ && w._.VERSION, w._?.VERSION);
      add("Bootstrap", w.bootstrap || q("link[href*='bootstrap']"), w.bootstrap?.Tooltip?.VERSION);
      add("Tailwind CSS (likely)", Array.from(document.querySelectorAll("[class]")).slice(0, 400).filter((e) => /\b(flex|grid|px-\d|py-\d|text-(sm|lg|xl)|bg-[a-z]+-\d{2,3}|rounded(-\w+)?)\b/.test(e.getAttribute("class") || "")).length > 40);
      add("WordPress", q("link[href*='wp-content'], script[src*='wp-includes']"));
      add("Shopify", w.Shopify, w.Shopify?.theme?.name);
      add("Wix", w.wixBiSession || q("meta[name='generator'][content*='Wix']"));
      add("Webflow", q("html[data-wf-site]"));
      add("Framer", q("[data-framer-hydrate-v2], #__framer-badge-container"));
      add("Google Tag Manager", w.google_tag_manager);
      add("Google Analytics", w.gtag || w.ga);
      add("Meta Pixel", w.fbq);
      add("Hotjar", w.hj);
      add("Microsoft Clarity", w.clarity);
      add("Sentry", w.Sentry || w.__SENTRY__);
      add("Stripe.js", w.Stripe);
      add("Razorpay", w.Razorpay);
      add("Firebase", w.firebase);
      add("Intercom", w.Intercom);
      add("Lottie", w.lottie || q("lottie-player, dotlottie-player"));
      add("Swiper", w.Swiper || q(".swiper"));
      add("Framer Motion (likely)", q("[style*='--framer'], [data-projection-id]"));
      return out;
    }).catch(() => []);

    const cookies = (await ctx.cookies()).map((c) => ({
      name: c.name, domain: c.domain, secure: c.secure, httpOnly: c.httpOnly, sameSite: c.sameSite,
      thirdParty: !c.domain.replace(/^\./, "").endsWith(siteHost),
      expiresDays: c.expires > 0 ? Math.round((c.expires * 1000 - Date.now()) / 86400000) : null,
    })).slice(0, 60);

    // Phone visit: separate context so the site serves its real mobile layout.
    const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA_MOBILE, ignoreHTTPSErrors: true });
    const mpage = await mctx.newPage();
    await mpage.addInitScript(INIT);
    const t0 = Date.now();
    let mobileLoadMs: number | null = null;
    try {
      await mpage.goto(url.toString(), { waitUntil: "load", timeout: 30000 });
      mobileLoadMs = Date.now() - t0;
      await mpage.waitForLoadState("networkidle", { timeout: 6000 }).catch(() => {});
    } catch { /* keep what rendered */ }
    const mobileExtra = await mpage.evaluate(() => {
      const small = Array.from(document.querySelectorAll("a, button, input, select, [role=button]")).filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.width < 32 || r.height < 32); }).length;
      const rr = (window as unknown as { __read?: { lcp: number | null } }).__read;
      return { small, hscroll: document.documentElement.scrollWidth > window.innerWidth + 2, lcp: rr?.lcp != null ? Math.round(rr.lcp) : null };
    }).catch(() => ({ small: 0, hscroll: false, lcp: null }));
    const mobile = await mpage.screenshot({ type: "jpeg", quality: 55 });
    await mctx.close();

    // Network rollups
    const byType: Record<string, { count: number; kb: number }> = {};
    const tp = new Map<string, { count: number; kb: number }>();
    for (const q of reqs) {
      const t = (byType[q.type] ??= { count: 0, kb: 0 }); t.count++; t.kb += q.kb;
      if (q.thirdParty) { const x = tp.get(q.host) ?? { count: 0, kb: 0 }; x.count++; x.kb += q.kb; tp.set(q.host, x); }
      const proto = q.url.split(":")[0]; protocols[proto] = (protocols[proto] ?? 0) + 1;
    }
    for (const k of Object.keys(byType)) byType[k].kb = Math.round(byType[k].kb);
    const textual = (m: string | null) => !!m && /javascript|css|html|json|xml|svg|text/.test(m);
    const noise = /google-analytics|googletagmanager|doubleclick|facebook|hotjar|sentry|segment|clarity|_rsc=|__next\.|\.txt$|\/_next\/|\/__nextjs/;

    const cov = (entries: { url: string; text?: string; source?: string; ranges?: { start: number; end: number }[]; functions?: { ranges: { startOffset: number; endOffset: number; count: number }[] }[] }[], type: "js" | "css") =>
      entries.filter((e) => e.url && !e.url.startsWith("data:")).map((e) => {
        const total = (e.text ?? e.source ?? "").length;
        let used = 0;
        if (type === "css") used = (e.ranges ?? []).reduce((a, r) => a + (r.end - r.start), 0);
        else {
          // V8 block coverage: top-level function range counts the whole script; subtract uncovered nested ranges.
          let unused = 0;
          for (const f of e.functions ?? []) for (const r of f.ranges) if (r.count === 0) unused += r.endOffset - r.startOffset;
          used = Math.max(0, total - unused);
        }
        return { url: short(e.url, 120), type, kb: Math.round(total / 1024), unusedPct: total ? Math.round(100 * (1 - used / total)) : 0, _t: total, _u: total - used };
      });
    const jsF = cov(jsCov as never, "js"), cssF = cov(cssCov as never, "css");
    const sumKB = (a: { _t: number }[]) => Math.round(a.reduce((s, x) => s + x._t, 0) / 1024);
    const unusedKB = (a: { _u: number }[]) => Math.round(a.reduce((s, x) => s + x._u, 0) / 1024);

    const imgReqs = reqs.filter((q) => q.type === "image");

    return {
      url: url.toString(), finalUrl: page.url(), title: data.title, scannedAt: new Date().toISOString(),
      screenshots: { desktop: jpeg(desktop), mobile: jpeg(mobile), full: jpeg(full) },
      response: { status: mainRes?.status() ?? null, headers: mainHeaders, httpVersion, redirects },
      design: data.design,
      layout: data.layout,
      content: data.content,
      links: data.links,
      seo: data.seo,
      images: {
        ...data.images,
        totalKB: Math.round(imgReqs.reduce((a, q) => a + q.kb, 0)),
        largest: imgReqs.sort((a, b) => b.kb - a.kb).slice(0, 6).map((q) => ({ src: short(q.url, 120), kb: Math.round(q.kb) })),
      },
      a11y: { ...data.a11y, smallTapTargets: mobileExtra.small, mobileHorizontalScroll: mobileExtra.hscroll },
      features: data.features,
      network: {
        requests: reqs.length,
        transferKB: Math.round(reqs.reduce((a, q) => a + q.kb, 0)),
        failed,
        byType,
        thirdParty: [...tp.entries()].sort((a, b) => b[1].kb - a[1].kb).slice(0, 25).map(([host, v]) => ({ host, count: v.count, kb: Math.round(v.kb), category: tpCategory(host) })),
        apiCalls: reqs.filter((q) => (q.type === "xhr" || q.type === "fetch") && !noise.test(q.url)).slice(0, 30).map((q) => ({ method: q.method, url: short(q.url.split("?")[0], 160), status: q.status, mime: q.mime })),
        heaviest: [...reqs].sort((a, b) => b.kb - a.kb).slice(0, 10).map((q) => ({ url: short(q.url, 120), type: q.type, kb: Math.round(q.kb) })),
        slowest: reqs.filter((q) => q.ms != null).sort((a, b) => b.ms! - a.ms!).slice(0, 8).map((q) => ({ url: short(q.url, 120), type: q.type, ms: q.ms! })),
        uncompressed: reqs.filter((q) => !q.encoding && textual(q.mime) && q.kb > 10).slice(0, 10).map((q) => short(q.url, 120)),
        noCache: reqs.filter((q) => !q.thirdParty && ["script", "stylesheet", "image", "font"].includes(q.type) && (!q.cache || /no-cache|no-store|max-age=0\b/.test(q.cache))).slice(0, 10).map((q) => short(q.url, 120)),
        protocols,
      },
      coverage: {
        jsKB: sumKB(jsF), jsUnusedKB: unusedKB(jsF), cssKB: sumKB(cssF), cssUnusedKB: unusedKB(cssF),
        files: [...jsF, ...cssF].sort((a, b) => b._u - a._u).slice(0, 12).map(({ url, type, kb, unusedPct }) => ({ url, type, kb, unusedPct })),
      },
      speed: { ...data.speed, mobileLoadMs, mobileLcpMs: mobileExtra.lcp },
      storage: { cookies, ...data.storage },
      runtime, consoleErrors, pageErrors,
    };
  } finally {
    await ctx.close();
  }
}
