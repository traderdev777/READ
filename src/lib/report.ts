// READ report: score every area and list prioritized findings with fixes.
// Deterministic; Gemini adds a written narrative when GEMINI_API_KEY is set.
import type { ScanResult } from "./scan/page";
import type { DeepScan } from "./scan/browser";
import type { SitemapResult } from "./scan/sitemap";
import { aiEnabled, gemini } from "./ai/gemini";

export type Severity = "critical" | "high" | "medium" | "low" | "pass";
export type Finding = { area: Area; severity: Severity; title: string; detail: string; fix?: string };
export type Area = "Performance" | "SEO" | "Accessibility" | "Best practices" | "Security" | "Mobile" | "Content";
export type Report = {
  scores: Record<Area, number> & { overall: number };
  findings: Finding[];
  securityHeaders: { name: string; present: boolean; value: string | null; why: string }[];
  summary: string;
  markdown: string;
  ai: boolean;
  aiNarrative?: string;
  aiError?: string;
};

const PEN: Record<Severity, number> = { critical: 25, high: 12, medium: 6, low: 2, pass: 0 };
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

const SEC_HEADERS: [string, string][] = [
  ["strict-transport-security", "Forces HTTPS on every visit (HSTS)."],
  ["content-security-policy", "Limits which scripts can run; main defence against XSS."],
  ["x-frame-options", "Stops other sites framing yours (clickjacking). CSP frame-ancestors also works."],
  ["x-content-type-options", "Stops browsers guessing file types (should be 'nosniff')."],
  ["referrer-policy", "Controls how much of your URLs leak to other sites."],
  ["permissions-policy", "Turns off camera, mic, location etc. unless needed."],
  ["cross-origin-opener-policy", "Isolates your window from pop-ups opened by other origins."],
];

export function analyze(q: ScanResult, d: DeepScan | null, s: SitemapResult | null) {
  const F: Finding[] = [];
  const add = (area: Area, severity: Severity, title: string, detail: string, fix?: string) => F.push({ area, severity, title, detail, fix });

  // ---------- Performance ----------
  if (d) {
    const sp = d.speed;
    if (sp.lcpMs != null) {
      if (sp.lcpMs > 4000) add("Performance", "critical", `Slow main paint (LCP ${(sp.lcpMs / 1000).toFixed(1)} s)`, `Largest element: ${sp.lcpElement ?? "unknown"}. Google's "good" is under 2.5 s.`, "Preload the hero image, serve it as AVIF/WebP at the displayed size, and remove render-blocking scripts above it.");
      else if (sp.lcpMs > 2500) add("Performance", "high", `Main paint needs work (LCP ${(sp.lcpMs / 1000).toFixed(1)} s)`, `Largest element: ${sp.lcpElement ?? "unknown"}.`, "Preload the LCP resource and shrink it; defer non-critical JS.");
      else add("Performance", "pass", `Fast main paint (LCP ${(sp.lcpMs / 1000).toFixed(1)} s)`, "Under the 2.5 s target.");
    }
    if (sp.cls != null) {
      if (sp.cls > 0.25) add("Performance", "high", `Page jumps while loading (CLS ${sp.cls})`, "Content moves after it appears.", "Give images, embeds and ads fixed width/height or aspect-ratio; avoid inserting banners above content.");
      else if (sp.cls > 0.1) add("Performance", "medium", `Some layout shift (CLS ${sp.cls})`, "Target is under 0.1.", "Reserve space for images and late-loading components.");
      else add("Performance", "pass", `Stable layout (CLS ${sp.cls})`, "Under the 0.1 target.");
    }
    if (sp.tbtMs > 600) add("Performance", "high", `Main thread blocked ${sp.tbtMs} ms`, `${sp.longTasks} long JavaScript tasks; taps feel laggy.`, "Code-split, remove unused libraries, move work to web workers.");
    else if (sp.tbtMs > 200) add("Performance", "medium", `Main thread blocked ${sp.tbtMs} ms`, `${sp.longTasks} long tasks.`, "Defer third-party scripts and split large bundles.");
    if (sp.ttfbMs != null && sp.ttfbMs > 800) add("Performance", "medium", `Slow server response (TTFB ${sp.ttfbMs} ms)`, "Measured from READ's server.", "Cache HTML at the edge/CDN or speed up the backend.");
    const mb = d.network.transferKB / 1024;
    if (mb > 5) add("Performance", "critical", `Very heavy page (${mb.toFixed(1)} MB)`, `${d.network.requests} requests. Heaviest: ${d.network.heaviest[0]?.url ?? ""} (${d.network.heaviest[0]?.kb ?? 0} KB).`, "Compress and resize images/video, lazy-load below-the-fold media.");
    else if (mb > 2.5) add("Performance", "high", `Heavy page (${mb.toFixed(1)} MB)`, `${d.network.requests} requests.`, "Trim images and scripts; target under 1.5 MB.");
    else add("Performance", "pass", `Page weight ${mb.toFixed(1)} MB`, `${d.network.requests} requests.`);
    if (d.network.requests > 120) add("Performance", "medium", `${d.network.requests} network requests`, "Many round trips slow mobile networks.", "Bundle small files, drop unused third parties.");
    if (d.coverage.jsKB > 0 && d.coverage.jsUnusedKB / d.coverage.jsKB > 0.5 && d.coverage.jsUnusedKB > 150) add("Performance", "high", `${d.coverage.jsUnusedKB} KB of JavaScript never runs`, `${Math.round((100 * d.coverage.jsUnusedKB) / d.coverage.jsKB)}% of ${d.coverage.jsKB} KB loaded is unused on this page.`, "Code-split per route and lazy-load heavy widgets.");
    if (d.coverage.cssKB > 0 && d.coverage.cssUnusedKB / d.coverage.cssKB > 0.6 && d.coverage.cssUnusedKB > 50) add("Performance", "medium", `${d.coverage.cssUnusedKB} KB of unused CSS`, `${Math.round((100 * d.coverage.cssUnusedKB) / d.coverage.cssKB)}% of stylesheets unused here.`, "Purge unused CSS or split per page.");
    if (d.images.oversized.length) add("Performance", "medium", `${d.images.oversized.length} images far larger than shown`, d.images.oversized.slice(0, 3).map((i) => `${i.natural} shown at ${i.shown}`).join("; "), "Use responsive srcset / next/image.");
    const modern = (d.images.formats.webp ?? 0) + (d.images.formats.avif ?? 0) + (d.images.formats.svg ?? 0);
    const legacy = (d.images.formats.jpg ?? 0) + (d.images.formats.png ?? 0) + (d.images.formats.gif ?? 0);
    if (legacy > 3 && legacy > modern) add("Performance", "medium", `${legacy} images in old formats (JPG/PNG/GIF)`, `Modern formats: ${modern}.`, "Convert to AVIF/WebP, often 30–70% smaller.");
    if (d.images.count > 6 && d.images.lazy < d.images.count / 3) add("Performance", "low", `Only ${d.images.lazy}/${d.images.count} images lazy-loaded`, "", "Add loading=\"lazy\" to images below the fold.");
    if (d.network.uncompressed.length) add("Performance", "medium", `${d.network.uncompressed.length} text files sent without compression`, d.network.uncompressed.slice(0, 2).join(", "), "Enable Brotli or gzip on the server/CDN.");
    if (d.network.noCache.length) add("Performance", "low", `${d.network.noCache.length} static files not cached`, d.network.noCache.slice(0, 2).join(", "), "Set long Cache-Control max-age with hashed filenames.");
    const tpKB = d.network.thirdParty.reduce((a, t) => a + t.kb, 0);
    if (tpKB > 500) add("Performance", "medium", `Third parties add ${Math.round(tpKB)} KB`, d.network.thirdParty.slice(0, 4).map((t) => `${t.host} (${t.category})`).join(", "), "Delay non-essential tags until after interaction.");
  }

  // ---------- SEO ----------
  const seo = d?.seo;
  const title = seo?.title ?? q.title ?? "";
  if (!title) add("SEO", "critical", "Missing page title", "", "Add a unique <title> of 30–60 characters.");
  else if (title.length > 65) add("SEO", "low", `Title is long (${title.length} chars)`, title, "Keep it under ~60 so Google doesn't cut it.");
  else if (title.length < 20) add("SEO", "low", `Title is short (${title.length} chars)`, title, "Add the main keyword and brand.");
  else add("SEO", "pass", "Good title length", title);
  const desc = seo?.description ?? q.description;
  if (!desc) add("SEO", "high", "Missing meta description", "", "Write a 120–160 character summary with a call to action.");
  else if (desc.length > 170) add("SEO", "low", `Meta description long (${desc.length} chars)`, "", "Trim to ~155 characters.");
  else add("SEO", "pass", "Meta description present", `${desc.length} characters.`);
  if (!(seo?.canonical ?? q.meta.canonical)) add("SEO", "medium", "No canonical URL", "", "Add <link rel=\"canonical\"> to avoid duplicate-content splits.");
  if (seo) {
    if (seo.robotsMeta && /noindex/i.test(seo.robotsMeta)) add("SEO", "critical", "Page is set to noindex", `robots: ${seo.robotsMeta}`, "Remove noindex if this page should rank.");
    if (!seo.og.title || !seo.og.image) add("SEO", "medium", "Incomplete Open Graph tags", `Has: ${Object.keys(seo.og).join(", ") || "none"}.`, "Add og:title, og:description, og:image (1200×630) for good link previews.");
    else add("SEO", "pass", "Open Graph tags set", Object.keys(seo.og).join(", "));
    if (!seo.twitter.card) add("SEO", "low", "No Twitter/X card tags", "", "Add twitter:card = summary_large_image.");
    if (!seo.jsonLdTypes.length) add("SEO", "medium", "No structured data (JSON-LD)", "", "Add schema.org JSON-LD (Organization, Product, LocalBusiness, FAQPage…) for rich results.");
    else add("SEO", "pass", "Structured data found", seo.jsonLdTypes.join(", "));
    if (!seo.lang) add("SEO", "medium", "No lang attribute on <html>", "", "Set lang=\"en\" (or the right language).");
    if (!seo.favicon) add("SEO", "low", "No favicon link", "", "Add icons incl. apple-touch-icon.");
  }
  if (d) {
    if (d.content.h1Count === 0) add("SEO", "high", "No H1 heading", "", "Give every page one clear H1.");
    else if (d.content.h1Count > 1) add("SEO", "low", `${d.content.h1Count} H1 headings`, "", "Use a single H1 per page.");
    if (d.content.wordCount < 250) add("Content", "medium", `Thin content (${d.content.wordCount} words)`, "", "Add helpful copy; search engines favour substance.");
    if (d.links.internal < 5) add("SEO", "low", `Few internal links (${d.links.internal})`, "", "Link to key pages to spread authority.");
  }
  if (s) {
    if (s.source !== "sitemap") add("SEO", "medium", "No XML sitemap found", "Checked robots.txt and /sitemap.xml.", "Publish /sitemap.xml and reference it in robots.txt.");
    else add("SEO", "pass", `Sitemap with ${s.total} URLs`, s.sitemaps[0] ?? "");
    if (!s.robots.found) add("SEO", "low", "No robots.txt", "", "Add one with your sitemap URL.");
  }

  // ---------- Accessibility ----------
  if (d) {
    const a = d.a11y;
    if (a.imagesWithoutAlt) add("Accessibility", a.imagesWithoutAlt > 5 ? "high" : "medium", `${a.imagesWithoutAlt} images without alt text`, "Screen readers can't describe them.", "Add alt text (alt=\"\" for decorative images).");
    if (a.inputsWithoutLabel) add("Accessibility", "high", `${a.inputsWithoutLabel} form fields without labels`, "", "Use <label for> or aria-label; placeholders aren't labels.");
    if (a.buttonsWithoutName) add("Accessibility", "high", `${a.buttonsWithoutName} buttons with no accessible name`, "Usually icon-only buttons.", "Add aria-label to icon buttons.");
    if (a.linksWithoutText) add("Accessibility", "medium", `${a.linksWithoutText} links with no text`, "", "Add text or aria-label.");
    if (a.lowContrast.length) add("Accessibility", a.lowContrast.length > 3 ? "high" : "medium", `${a.lowContrast.length}+ low-contrast text samples`, a.lowContrast.slice(0, 3).map((c) => `"${c.text}" ${c.ratio}:1`).join("; "), "Reach 4.5:1 for body text, 3:1 for large text.");
    if (a.headingSkips) add("Accessibility", "low", `${a.headingSkips} skipped heading levels`, "e.g. H2 → H4.", "Keep heading levels in order.");
    if (!a.landmarks.includes("main")) add("Accessibility", "medium", "No <main> landmark", `Landmarks: ${a.landmarks.join(", ") || "none"}.`, "Wrap primary content in <main>.");
    if (a.tabindexPositive) add("Accessibility", "low", `${a.tabindexPositive} elements with positive tabindex`, "", "Use DOM order instead.");
    if (a.smallTapTargets > 5) add("Mobile", "medium", `${a.smallTapTargets} tap targets under 32px on phones`, "", "Make tappable items at least 44×44px.");
    if (a.mobileHorizontalScroll) add("Mobile", "high", "Page scrolls sideways on phones", "Something is wider than the screen.", "Find the overflowing element (often images, tables, or 100vw).");
    if (!d.seo.viewport) add("Mobile", "critical", "No viewport meta tag", "", "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">.");
    else add("Mobile", "pass", "Responsive viewport set", d.seo.viewport);
    if (d.speed.mobileLcpMs != null && d.speed.mobileLcpMs > 4000) add("Mobile", "high", `Slow on phones (LCP ${(d.speed.mobileLcpMs / 1000).toFixed(1)} s)`, "", "Ship smaller images and less JS to mobile.");
    if (!d.design.breakpoints.length) add("Mobile", "low", "No CSS breakpoints readable", "Stylesheets may be cross-origin.");
  }

  // ---------- Best practices ----------
  if (d) {
    if (d.consoleErrors.length || d.pageErrors.length) add("Best practices", d.pageErrors.length ? "high" : "medium", `${d.consoleErrors.length + d.pageErrors.length} JavaScript errors`, [...d.pageErrors, ...d.consoleErrors].slice(0, 2).join(" | "), "Fix errors; they can break features silently.");
    else add("Best practices", "pass", "No console errors", "");
    if (d.network.failed.length) add("Best practices", "medium", `${d.network.failed.length} failed or broken requests`, d.network.failed.slice(0, 3).map((f) => `${f.status ?? "failed"} ${f.url}`).join("; "), "Remove or fix broken resources.");
    if (d.response.redirects.length > 1) add("Best practices", "low", `${d.response.redirects.length} redirects before the page`, d.response.redirects.join(" → "), "Link straight to the final URL.");
    if (d.layout.domNodes > 3000) add("Best practices", "medium", `Large DOM (${d.layout.domNodes} elements)`, `Depth ${d.layout.domDepth}.`, "Virtualise long lists; simplify wrappers.");
    if (d.network.protocols.http) add("Security", "high", `${d.network.protocols.http} insecure http:// requests`, "Mixed content.", "Load everything over HTTPS.");
    const tpCookies = d.storage.cookies.filter((c) => c.thirdParty).length;
    if (tpCookies) add("Best practices", "low", `${tpCookies} third-party cookies set before consent`, "", "Gate trackers behind a consent banner (DPDP/GDPR).");
  }

  // ---------- Security ----------
  const headers = d?.response.headers ?? {};
  const securityHeaders = SEC_HEADERS.map(([name, why]) => ({ name, present: name in headers, value: headers[name] ?? null, why }));
  if (!q.security.https) add("Security", "critical", "Site not served over HTTPS", "", "Get a TLS certificate (free via Let's Encrypt / your host).");
  else add("Security", "pass", "HTTPS enabled", "");
  for (const h of securityHeaders) if (!h.present) {
    const sev: Severity = h.name === "content-security-policy" || h.name === "strict-transport-security" ? "medium" : "low";
    add("Security", sev, `Missing ${h.name}`, h.why, `Send the ${h.name} header from your server/CDN.`);
  }
  for (const k of ["x-powered-by", "server"]) if (headers[k] && /\d/.test(headers[k])) add("Security", "low", `${k} reveals version (${headers[k]})`, "", "Hide software versions in headers.");
  if (d) {
    const weak = d.storage.cookies.filter((c) => !c.thirdParty && (!c.secure || c.sameSite === "None"));
    if (weak.length) add("Security", "low", `${weak.length} first-party cookies missing Secure/SameSite`, weak.slice(0, 4).map((c) => c.name).join(", "), "Set Secure; SameSite=Lax; HttpOnly where possible.");
  }

  // ---------- Scores ----------
  const areas: Area[] = ["Performance", "SEO", "Accessibility", "Best practices", "Security", "Mobile", "Content"];
  const scores = Object.fromEntries(areas.map((a) => [a, clamp(100 - F.filter((f) => f.area === a).reduce((s, f) => s + PEN[f.severity], 0))])) as Record<Area, number>;
  const weights: Partial<Record<Area, number>> = { Performance: 3, SEO: 2, Accessibility: 2, "Best practices": 1, Security: 1, Mobile: 2, Content: 1 };
  const overall = clamp(areas.reduce((s, a) => s + scores[a] * (weights[a] ?? 1), 0) / areas.reduce((s, a) => s + (weights[a] ?? 1), 0));
  const order: Severity[] = ["critical", "high", "medium", "low", "pass"];
  F.sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity));
  return { findings: F, scores: { ...scores, overall }, securityHeaders };
}

function toMarkdown(q: ScanResult, d: DeepScan | null, s: SitemapResult | null, r: ReturnType<typeof analyze>, summary: string) {
  const L: string[] = [];
  L.push(`# READ teardown: ${q.title || q.finalUrl}`, "", `${q.finalUrl} · scanned ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC`, "", summary, "");
  L.push("## Scores", "", "| Area | Score |", "|---|---|", ...Object.entries(r.scores).map(([k, v]) => `| ${k} | ${v} |`), "");
  L.push("## Issues and fixes", "");
  for (const f of r.findings.filter((f) => f.severity !== "pass")) L.push(`- **[${f.severity.toUpperCase()}] ${f.area}: ${f.title}.** ${f.detail}${f.fix ? ` _Fix:_ ${f.fix}` : ""}`);
  L.push("", "## What's working", "", ...r.findings.filter((f) => f.severity === "pass").map((f) => `- ${f.area}: ${f.title}`), "");
  L.push("## Tech stack", "", ...q.stack.map((t) => `- ${t.category}: ${t.name}`), ...(d?.runtime ?? []).map((t) => `- Runtime: ${t.name}${t.version ? ` ${t.version}` : ""}`), "");
  if (d) {
    L.push("## Third parties", "", "| Host | Category | Requests | KB |", "|---|---|---|---|", ...d.network.thirdParty.map((t) => `| ${t.host} | ${t.category} | ${t.count} | ${t.kb} |`), "");
    L.push("## Design system", "", `- Heading font: ${d.design.headingFont} · Body font: ${d.design.bodyFont}`, `- Colours: ${d.design.colors.map((c) => `${c.role} ${c.hex}`).join(", ")}`, `- Type scale: ${d.design.fontSizes.map((f) => f.size).join(", ")}`, `- Spacing: ${d.design.spacing.map((x) => x.value).join(", ")}`, `- Radii: ${d.design.radii.map((x) => x.value).join(", ")}`, `- Breakpoints: ${d.design.breakpoints.join(", ") || "n/a"}`, "");
    L.push("## Speed", "", `TTFB ${d.speed.ttfbMs} ms · FCP ${d.speed.fcpMs} ms · LCP ${d.speed.lcpMs} ms · CLS ${d.speed.cls} · TBT ${d.speed.tbtMs} ms · load ${d.speed.loadMs} ms · mobile LCP ${d.speed.mobileLcpMs} ms`, "");
    L.push("## Features", "", `Has: ${d.features.filter((f) => f.found).map((f) => f.name).join(", ")}`, "", `Missing: ${d.features.filter((f) => !f.found).map((f) => f.name).join(", ")}`, "");
    if (d.network.apiCalls.length) L.push("## API calls", "", ...d.network.apiCalls.map((a) => `- ${a.method} ${a.url} → ${a.status} ${a.mime ?? ""}`), "");
  }
  if (s?.templates.length) L.push("## Page templates", "", ...s.templates.map((t) => `- ${t.pattern} × ${t.count}`), "");
  return L.join("\n");
}

export async function buildReport(q: ScanResult, d: DeepScan | null, s: SitemapResult | null): Promise<Report> {
  const r = analyze(q, d, s);
  const issues = r.findings.filter((f) => f.severity !== "pass");
  const crit = issues.filter((f) => f.severity === "critical" || f.severity === "high");
  const fw = d?.runtime.find((x) => /Next|Nuxt|React|Vue|Angular|Svelte|Astro|Gatsby|WordPress|Shopify|Wix|Webflow|Framer/.test(x.name))?.name ?? q.stack.find((x) => x.category === "Framework")?.name;
  const summary = `Overall **${r.scores.overall}/100**. Built with ${fw ?? "an unidentified stack"}. ${issues.length} issues found, ${crit.length} high priority${crit[0] ? `, led by "${crit[0].title}"` : ""}.`;
  const markdown = toMarkdown(q, d, s, r, summary);
  const base: Report = { ...r, summary, markdown, ai: false };
  if (!aiEnabled()) return base;
  try {
    const slim = { quick: q, deep: d ? { ...d, screenshots: undefined } : null, sitemap: s ? { ...s, urls: s.urls.slice(0, 30) } : null };
    const aiNarrative = await gemini(
      `Raw scan data:\n${JSON.stringify(slim).slice(0, 50000)}\n\nDeterministic report:\n${markdown}\n\nWrite an expert teardown in Markdown: 1) What the product is and who it's for, 2) Business model & funnels (inferred, mark as such), 3) Architecture (front end, likely backend, hosting, data/APIs), 4) UX & design critique, 5) Top 7 fixes ranked by impact with effort (S/M/L), 6) How to build a better version: stack, pages, components, 2-week plan. Never invent numbers; mark inferences.`,
      { system: "You are READ, a precise reverse-engineering analyst.", maxTokens: 8192 },
    );
    return { ...base, ai: true, aiNarrative };
  } catch (e) {
    return { ...base, aiError: e instanceof Error ? e.message : String(e) };
  }
}
