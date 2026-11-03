// READ actions: do something with a section or the whole site.
// - rebuild: original React + CSS module for a section (structure and design tokens, fresh code; original copy only in "exact" mode for owned sites)
// - improve: section-level fixes with code
// - fix-all: site-level fixes as ready-to-paste config/code
// - custom: free-form instruction (Gemini when GEMINI_API_KEY is set)
import type { Block, DeepScan } from "./scan/browser";
import type { Report } from "./report";
import type { ScanResult } from "./scan/page";
import { aiEnabled, gemini } from "./ai/gemini";

export type CodeFile = { path: string; lang: string; code: string };
export type ActionResult = { title: string; summary: string; files: CodeFile[]; previewHtml?: string; steps?: string[]; ai?: boolean; aiError?: string };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const jsx = (s: string) => s.replace(/[{}<>]/g, (c) => `{"${c}"}`);
const pascal = (s: string) => (s.replace(/[^a-zA-Z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : "")).replace(/^./, (c) => c.toUpperCase()) || "Section").replace(/^\d/, "S$&");
const hex = (c: string) => { const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/); return m ? "#" + [m[1], m[2], m[3]].map((x) => (+x).toString(16).padStart(2, "0")).join("") : c; };
const isDark = (c: string) => { const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/); if (!m) return false; return 0.299 * +m[1] + 0.587 * +m[2] + 0.114 * +m[3] < 128; };

type Tokens = { primary: string; font: string; radius: string; bg: string; fg: string; muted: string };
function tokens(d: DeepScan, b: Block, primary?: string): Tokens {
  const btn = d.design.buttons.find((x) => !/rgba\(.*, 0\)/.test(x.bg) && !/^#(f{6}|0{6})$/i.test(hex(x.bg)));
  const bg = hex(b.bg); const dark = isDark(b.bg);
  return {
    primary: primary || (btn ? hex(btn.bg) : "#6d28d9"),
    font: d.design.bodyFont ?? "Inter",
    radius: btn?.radius && btn.radius !== "0px" ? btn.radius : "10px",
    bg, fg: dark ? "#f8fafc" : hex(d.design.colors.find((c) => c.role === "text")?.value ?? "rgb(15, 23, 42)"),
    muted: dark ? "#cbd5e1" : "#64748b",
  };
}

const PLACEHOLDER: Record<string, { heading: string; sub: string; item: (i: number) => [string, string]; cta: string[] }> = {
  "Header / navigation": { heading: "Brand", sub: "", item: (i) => [["Product", "Solutions", "Pricing", "Resources", "Company", "Blog"][i % 6], ""], cta: ["Sign in", "Get started"] },
  Hero: { heading: "Your headline that says what you do, in one line", sub: "A short sentence on who it's for and the result they get.", item: () => ["", ""], cta: ["Get started", "Learn more"] },
  "Feature grid": { heading: "Everything you need", sub: "Short intro to the features below.", item: (i) => [["Fast setup", "Secure by default", "Works everywhere", "Built-in analytics", "Integrations", "Real support"][i % 6], "One sentence on the benefit of this feature."], cta: [] },
  Pricing: { heading: "Simple pricing", sub: "Pick the plan that fits.", item: (i) => [["Starter", "Pro", "Business", "Enterprise"][i % 4], ["₹0 / month", "₹999 / month", "₹2,999 / month", "Custom"][i % 4]], cta: ["Choose plan"] },
  Testimonials: { heading: "Loved by customers", sub: "", item: () => ["“A short, specific quote from a real customer.”", "Name, Role at Company"], cta: [] },
  FAQ: { heading: "Frequently asked questions", sub: "", item: (i) => [["How does it work?", "How much does it cost?", "Can I cancel anytime?", "Is my data safe?"][i % 4], "A clear, short answer."], cta: [] },
  Stats: { heading: "", sub: "", item: (i) => [["10k+", "99.9%", "4.8★", "24/7"][i % 4], ["Customers", "Uptime", "Rating", "Support"][i % 4]], cta: [] },
  "Product / listing grid": { heading: "Featured listings", sub: "Browse the latest picks.", item: (i) => [`Item name ${i + 1}`, "₹ Price · key detail · location"], cta: ["View all"] },
  "Logo strip / gallery": { heading: "Trusted by teams everywhere", sub: "", item: (i) => [`Logo ${i + 1}`, ""], cta: [] },
  "Call to action": { heading: "Ready to get started?", sub: "One line that removes the last doubt.", item: () => ["", ""], cta: ["Get started"] },
  Form: { heading: "Get in touch", sub: "We reply within one working day.", item: () => ["", ""], cta: ["Send"] },
  Footer: { heading: "Brand", sub: "© Your company", item: (i) => [["Product", "Company", "Resources", "Legal"][i % 4], "Link one · Link two · Link three"], cta: [] },
  Content: { heading: "Section heading", sub: "Supporting paragraph for this section.", item: (i) => [`Point ${i + 1}`, "Short supporting text."], cta: [] },
};

export function rebuildSection(d: DeepScan, b: Block, opts: { exact: boolean; primary?: string }): ActionResult {
  const t = tokens(d, b, opts.primary);
  const P = PLACEHOLDER[b.kind] ?? PLACEHOLDER.Content;
  const name = pascal(b.kind.split(" ")[0]) + (b.index + 1);
  const n = Math.max(b.kind === "Hero" || b.kind === "Call to action" ? 0 : 3, Math.min(b.columns > 1 ? b.columns * (b.kind === "Feature grid" ? 2 : 1) : 3, 8));
  const src = opts.exact ? b.texts : [];
  const heading = opts.exact ? b.heading ?? src[0] ?? P.heading : P.heading;
  const sub = opts.exact ? src.find((x) => x !== heading && x.length > 30) ?? "" : P.sub;
  const rest = opts.exact ? src.filter((x) => x !== heading && x !== sub) : [];
  const items = Array.from({ length: n }, (_, i) => opts.exact && rest[i * 2] ? [rest[i * 2], rest[i * 2 + 1] ?? ""] : P.item(i));
  const ctas = (opts.exact && b.buttons.length ? b.buttons : P.cta).slice(0, 2);
  const cols = Math.min(Math.max(b.columns, 1), 4);
  const isHeader = b.kind === "Header / navigation";
  const isFaq = b.kind === "FAQ";
  const hasMedia = b.kind === "Hero" && b.images.length > 0;

  const tsx = `import styles from "./${name}.module.css";

// Rebuilt by READ from the structure of ${b.selector} (${b.kind}).
// ${opts.exact ? "Uses the original copy (exact mode, site owned by you)." : "Placeholder copy: replace with your own."}
const content = {
  heading: ${JSON.stringify(heading)},
  sub: ${JSON.stringify(sub)},
  items: ${JSON.stringify(items.map(([title, text]) => ({ title, text })), null, 2).replace(/\n/g, "\n  ")},
  ctas: ${JSON.stringify(ctas)},
};

export default function ${name}() {
  return (
    <${isHeader ? "header" : b.kind === "Footer" ? "footer" : "section"} className={styles.root}>
      <div className={styles.inner}>
${isHeader ? `        <a className={styles.logo} href="/">{content.heading}</a>
        <nav className={styles.nav}>{content.items.map((i) => <a key={i.title} href="#">{i.title}</a>)}</nav>
        <div className={styles.actions}>{content.ctas.map((c, i) => <a key={c} className={i ? styles.btn : styles.ghost} href="#">{c}</a>)}</div>` :
`        ${hasMedia ? "<div className={styles.copy}>" : "<div className={styles.head}>"}
          {content.heading && <${b.kind === "Hero" ? "h1" : "h2"} className={styles.title}>{content.heading}</${b.kind === "Hero" ? "h1" : "h2"}>}
          {content.sub && <p className={styles.sub}>{content.sub}</p>}
          {content.ctas.length > 0 && <div className={styles.ctas}>{content.ctas.map((c, i) => <a key={c} className={i ? styles.ghost : styles.btn} href="#">{c}</a>)}</div>}
        </div>
${hasMedia ? `        <div className={styles.media} aria-hidden="true" />\n` : ""}${n ? (isFaq ? `        <div className={styles.faq}>{content.items.map((i) => <details key={i.title}><summary>{i.title}</summary><p>{i.text}</p></details>)}</div>` :
`        <div className={styles.grid}>
          {content.items.map((i) => (
            <div key={i.title} className={styles.card}>
              <h3>{i.title}</h3>
              {i.text && <p>{i.text}</p>}
            </div>
          ))}
        </div>`) : ""}`}
      </div>
    </${isHeader ? "header" : b.kind === "Footer" ? "footer" : "section"}>
  );
}
`;

  const css = `.root { background: ${t.bg}; color: ${t.fg}; font-family: "${t.font}", system-ui, sans-serif; padding: ${isHeader ? "14px 0" : b.kind === "Hero" ? "96px 0" : "72px 0"}; }
.inner { max-width: 1160px; margin: 0 auto; padding: 0 24px; ${isHeader ? "display: flex; align-items: center; justify-content: space-between; gap: 24px;" : hasMedia ? "display: grid; grid-template-columns: 1.1fr 1fr; gap: 48px; align-items: center;" : ""} }
.head { ${b.kind === "Hero" || b.kind === "Call to action" ? "text-align: center; max-width: 760px; margin: 0 auto;" : "max-width: 680px; margin-bottom: 40px;"} }
.copy { min-width: 0; }
.title { font-size: ${b.kind === "Hero" ? "clamp(36px, 6vw, 60px)" : "clamp(28px, 4vw, 40px)"}; line-height: 1.1; letter-spacing: -0.02em; margin: 0 0 16px; }
.sub { font-size: 18px; color: ${t.muted}; margin: 0 0 28px; line-height: 1.6; }
.ctas { display: flex; gap: 12px; flex-wrap: wrap; ${b.kind === "Hero" && !hasMedia || b.kind === "Call to action" ? "justify-content: center;" : ""} }
.btn, .ghost { display: inline-flex; align-items: center; padding: 12px 22px; border-radius: ${t.radius}; font-weight: 600; text-decoration: none; }
.btn { background: ${t.primary}; color: #fff; }
.ghost { border: 1px solid color-mix(in srgb, ${t.fg} 20%, transparent); color: inherit; }
.grid { display: grid; grid-template-columns: repeat(${cols}, minmax(0, 1fr)); gap: 20px; }
.card { border: 1px solid color-mix(in srgb, ${t.fg} 12%, transparent); border-radius: calc(${t.radius} + 4px); padding: 24px; }
.card h3 { margin: 0 0 8px; font-size: 18px; }
.card p { margin: 0; color: ${t.muted}; }
.media { aspect-ratio: 4 / 3; border-radius: 20px; background: linear-gradient(135deg, ${t.primary}, color-mix(in srgb, ${t.primary} 30%, #fff)); }
.faq details { border-bottom: 1px solid color-mix(in srgb, ${t.fg} 12%, transparent); padding: 16px 0; }
.faq summary { cursor: pointer; font-weight: 600; }
.logo { font-weight: 800; font-size: 20px; color: inherit; text-decoration: none; }
.nav { display: flex; gap: 24px; } .nav a { color: ${t.muted}; text-decoration: none; }
.actions { display: flex; gap: 10px; }
@media (max-width: 760px) { .grid { grid-template-columns: 1fr; } .inner { grid-template-columns: 1fr !important; } .nav { display: none; } }
`;

  // Static HTML preview of the same component.
  const cls = (k: string) => `s-${k}`;
  const scoped = css.replace(/\.([a-z]+)/g, (_, k) => `.${cls(k)}`);
  const body = isHeader
    ? `<header class="${cls("root")}"><div class="${cls("inner")}"><a class="${cls("logo")}">${esc(heading)}</a><nav class="${cls("nav")}">${items.map(([x]) => `<a>${esc(x)}</a>`).join("")}</nav><div class="${cls("actions")}">${ctas.map((c, i) => `<a class="${cls(i ? "btn" : "ghost")}">${esc(c)}</a>`).join("")}</div></div></header>`
    : `<section class="${cls("root")}"><div class="${cls("inner")}"><div class="${cls(hasMedia ? "copy" : "head")}">${heading ? `<h2 class="${cls("title")}">${esc(heading)}</h2>` : ""}${sub ? `<p class="${cls("sub")}">${esc(sub)}</p>` : ""}${ctas.length ? `<div class="${cls("ctas")}">${ctas.map((c, i) => `<a class="${cls(i ? "ghost" : "btn")}">${esc(c)}</a>`).join("")}</div>` : ""}</div>${hasMedia ? `<div class="${cls("media")}"></div>` : ""}${n ? (isFaq ? `<div class="${cls("faq")}">${items.map(([q2, a]) => `<details><summary>${esc(q2)}</summary><p>${esc(a)}</p></details>`).join("")}</div>` : `<div class="${cls("grid")}">${items.map(([x, y]) => `<div class="${cls("card")}"><h3>${esc(x)}</h3>${y ? `<p>${esc(y)}</p>` : ""}</div>`).join("")}</div>`) : ""}</div></section>`;
  const previewHtml = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}${scoped}</style></head><body>${body}</body></html>`;

  return {
    title: `Rebuilt: ${b.kind} (#${b.index + 1})`,
    summary: `Fresh React component with a CSS module, using the section's layout (${b.layout}, ${b.columns} column${b.columns > 1 ? "s" : ""}), colours (${t.bg} / ${t.fg}, accent ${t.primary}), font ${t.font} and radius ${t.radius}.`,
    files: [{ path: `src/components/${name}.tsx`, lang: "tsx", code: tsx.replace(/^\s*\n/gm, "") }, { path: `src/components/${name}.module.css`, lang: "css", code: css }],
    previewHtml,
    steps: [`Copy both files into your Next.js project's src/components/.`, `Import it: import ${name} from "@/components/${name}";`, "Replace the content object with your copy.", ...(b.images.length ? [`Add your own ${b.images.length} image(s); the original images aren't copied.`] : [])],
  };
}

export function improveSection(d: DeepScan, b: Block): ActionResult {
  const files: CodeFile[] = [];
  const steps: string[] = [];
  if (b.images.some((i) => i.alt == null)) {
    steps.push("Add alt text to every image (empty alt=\"\" if decorative).");
    files.push({ path: "alt-text.html", lang: "html", code: b.images.filter((i) => i.alt == null).map((i) => `<img src="${i.src}" alt="Describe this image" loading="lazy" width="800" height="600" />`).join("\n") });
  }
  if (b.index > 1 && b.images.length) {
    steps.push("Lazy-load images below the fold and give them width/height (or use next/image).");
    files.push({ path: "next-image.tsx", lang: "tsx", code: `import Image from "next/image";\n\n// next/image adds lazy-loading, responsive srcset, AVIF/WebP and fixed dimensions.\n${b.images.slice(0, 3).map((i, k) => `<Image src="${i.src.split("?")[0]}" alt=${JSON.stringify(i.alt || "Describe image " + (k + 1))} width={800} height={600} sizes="(max-width: 768px) 100vw, 50vw" />`).join("\n")}` });
  }
  if (b.issues.some((x) => /aria-label/.test(x))) {
    steps.push("Give icon-only buttons an accessible name.");
    files.push({ path: "icon-button.html", lang: "html", code: `<button type="button" aria-label="Open menu">\n  <svg aria-hidden="true" focusable="false">…</svg>\n</button>` });
  }
  if (b.issues.some((x) => /label/.test(x) && /input/.test(x))) {
    steps.push("Label every form field.");
    files.push({ path: "labelled-input.html", lang: "html", code: b.inputs.map((n, i) => `<label for="f${i}">${esc(n)}</label>\n<input id="f${i}" name="${esc(n)}" autocomplete="on" />`).join("\n\n") || `<label for="email">Email</label>\n<input id="email" type="email" autocomplete="email" />` });
  }
  if (b.issues.some((x) => /H1/.test(x))) steps.push("Keep one H1 per page; change the others to H2.");
  const low = d.a11y.lowContrast.filter((c) => b.texts.some((t) => t.startsWith(c.text.slice(0, 20))));
  if (low.length) {
    steps.push(`Raise text contrast to 4.5:1 (${low.map((c) => `"${c.text.slice(0, 30)}" is ${c.ratio}:1`).join(", ")}).`);
    files.push({ path: "contrast.css", lang: "css", code: `/* Darken muted text on light backgrounds (or lighten on dark) */\n${b.selector} p, ${b.selector} span { color: ${isDark(b.bg) ? "#e2e8f0" : "#475569"}; }` });
  }
  if (b.kind === "Hero") {
    steps.push("Preload the hero image so the main paint (LCP) is faster.");
    const img = b.images[0]?.src;
    files.push({ path: "preload-hero.tsx", lang: "tsx", code: img ? `// In app/layout.tsx <head> (or use <Image priority /> for the hero):\n<link rel="preload" as="image" href="${img.split("?")[0]}" fetchPriority="high" />` : `// Hero has no <img>. If it uses a CSS background or video, add a lightweight poster image and preload it:\n<link rel="preload" as="image" href="/hero-poster.avif" fetchPriority="high" />` });
    if (d.speed.lcpElement?.includes("video")) steps.push("The main paint is a video: add a small poster image, compress the video, and use preload=\"metadata\".");
  }
  if (b.buttons.length === 0 && ["Hero", "Feature grid", "Pricing"].includes(b.kind)) steps.push("Add a clear call-to-action button to this section.");
  if (!steps.length) steps.push("No section-level problems found. Nice.");
  return { title: `Improve: ${b.kind} (#${b.index + 1})`, summary: b.issues.length ? `Found: ${b.issues.join("; ")}.` : "Checked images, buttons, forms, headings, contrast and speed for this section.", files, steps };
}

export function fixAll(q: ScanResult, d: DeepScan | null, r: Report): ActionResult {
  const host = new URL(q.finalUrl).hostname;
  const title = d?.seo.title || q.title || host;
  const desc = d?.seo.description || q.description || "Describe your site in about 150 characters.";
  const missingHeaders = r.securityHeaders.filter((h) => !h.present).map((h) => h.name);
  const H: Record<string, string> = {
    "strict-transport-security": "max-age=63072000; includeSubDomains; preload",
    "content-security-policy": "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; frame-ancestors 'self'",
    "x-frame-options": "SAMEORIGIN", "x-content-type-options": "nosniff", "referrer-policy": "strict-origin-when-cross-origin",
    "permissions-policy": "camera=(), microphone=(), geolocation=()", "cross-origin-opener-policy": "same-origin",
  };
  const files: CodeFile[] = [];
  if (missingHeaders.length) {
    files.push({ path: "next.config.ts (security headers)", lang: "ts", code: `import type { NextConfig } from "next";\n\nconst securityHeaders = [\n${missingHeaders.map((h) => `  { key: "${h}", value: "${H[h]}" },`).join("\n")}\n];\n\nconst nextConfig: NextConfig = {\n  async headers() {\n    return [{ source: "/(.*)", headers: securityHeaders }];\n  },\n};\n\nexport default nextConfig;\n// Note: headers() doesn't apply to output: "export" (static hosting). Use your host's config instead (below).` });
    files.push({ path: "nginx.conf (security headers)", lang: "nginx", code: missingHeaders.map((h) => `add_header ${h} "${H[h]}" always;`).join("\n") });
    files.push({ path: "vercel.json / _headers (Netlify, Cloudflare Pages)", lang: "json", code: JSON.stringify({ headers: [{ source: "/(.*)", headers: missingHeaders.map((h) => ({ key: h, value: H[h] })) }] }, null, 2) + `\n\n# Netlify / Cloudflare Pages: public/_headers\n/*\n${missingHeaders.map((h) => `  ${h}: ${H[h]}`).join("\n")}` });
  }
  const seo = d?.seo;
  if (!seo?.og.image || !seo?.jsonLdTypes.length || !seo?.canonical || !seo?.twitter.card) {
    files.push({ path: "app/layout.tsx (metadata + JSON-LD)", lang: "tsx", code: `import type { Metadata } from "next";\n\nexport const metadata: Metadata = {\n  metadataBase: new URL("https://${host}"),\n  title: { default: ${JSON.stringify(title.slice(0, 60))}, template: "%s | ${title.split(/[|\-–]/)[0].trim().slice(0, 30)}" },\n  description: ${JSON.stringify(desc.slice(0, 160))},\n  alternates: { canonical: "/" },\n  openGraph: { type: "website", url: "/", title: ${JSON.stringify(title.slice(0, 60))}, description: ${JSON.stringify(desc.slice(0, 160))}, images: [{ url: "/og.png", width: 1200, height: 630 }] },\n  twitter: { card: "summary_large_image" },\n  icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png" },\n};\n\nconst jsonLd = {\n  "@context": "https://schema.org",\n  "@type": "Organization",\n  name: ${JSON.stringify(title.split(/[|\-–]/)[0].trim())},\n  url: "https://${host}",\n  logo: "https://${host}/logo.png",\n  sameAs: [${(d?.links.social ?? []).map((s) => `"https://${s}.com/your-handle"`).join(", ")}],\n};\n\n// Inside <body>:\n<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />` });
  }
  if (r.findings.some((f) => /sitemap|robots/i.test(f.title) && f.severity !== "pass")) {
    files.push({ path: "app/sitemap.ts + app/robots.ts", lang: "ts", code: `// app/sitemap.ts\nimport type { MetadataRoute } from "next";\nexport default function sitemap(): MetadataRoute.Sitemap {\n  const base = "https://${host}";\n  return ["", ${q.structure.navLinks.slice(0, 6).map((l) => JSON.stringify(l.href.replace(/^https?:\/\/[^/]+/, "").replace(/^\/?/, "/").replace(/\/$/, ""))).join(", ")}].map((p) => ({ url: base + p, lastModified: new Date() }));\n}\n\n// app/robots.ts\nimport type { MetadataRoute } from "next";\nexport default function robots(): MetadataRoute.Robots {\n  return { rules: { userAgent: "*", allow: "/" }, sitemap: "https://${host}/sitemap.xml" };\n}` });
  }
  if (d && (d.images.oversized.length || (d.images.formats.jpg ?? 0) + (d.images.formats.png ?? 0) > 3)) {
    files.push({ path: "scripts/optimize-images.mjs", lang: "javascript", code: `// npm i -D sharp  ·  node scripts/optimize-images.mjs public/images\nimport sharp from "sharp";\nimport { readdir } from "node:fs/promises";\nimport path from "node:path";\n\nconst dir = process.argv[2] ?? "public";\nfor (const f of await readdir(dir)) {\n  if (!/\\.(jpe?g|png)$/i.test(f)) continue;\n  const src = path.join(dir, f);\n  await sharp(src).resize({ width: 1600, withoutEnlargement: true }).avif({ quality: 55 }).toFile(src.replace(/\\.\\w+$/, ".avif"));\n  await sharp(src).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 72 }).toFile(src.replace(/\\.\\w+$/, ".webp"));\n  console.log("optimized", f);\n}` });
  }
  if (d && d.network.thirdParty.some((t) => ["Analytics", "Advertising / pixels", "Chat / CRM"].includes(t.category))) {
    files.push({ path: "Load third-party tags later", lang: "tsx", code: `import Script from "next/script";\n\n// Loads after the page is interactive instead of blocking it.\n<Script src="https://www.googletagmanager.com/gtag/js?id=G-XXXX" strategy="lazyOnload" />` });
  }
  if (d?.speed.lcpElement?.includes("video")) {
    files.push({ path: "Hero video", lang: "html", code: `<video autoplay muted loop playsinline preload="metadata" poster="/hero-poster.avif">\n  <source src="/hero-720p.webm" type="video/webm" />\n  <source src="/hero-720p.mp4" type="video/mp4" />\n</video>\n<!-- Compress: ffmpeg -i hero.mp4 -vf scale=-2:720 -c:v libvpx-vp9 -b:v 0 -crf 38 -an hero-720p.webm -->` });
  }
  const issues = r.findings.filter((f) => f.severity !== "pass");
  return {
    title: "Fix the whole site",
    summary: `${issues.length} issues; code below covers the ones that can be fixed by config or copy-paste. The rest are in the checklist.`,
    files,
    steps: issues.map((f) => `[${f.severity}] ${f.title}${f.fix ? ` → ${f.fix}` : ""}`),
  };
}

export async function custom(instruction: string, scope: string, context: unknown): Promise<ActionResult> {
  if (!aiEnabled()) {
    return { title: "Custom instruction", summary: "Custom instructions need the AI model. Set GEMINI_API_KEY on the server and try again. Rebuild, Improve and Fix work without it.", files: [], ai: false };
  }
  try {
    const out = await gemini(
      `Scope: ${scope}\nInstruction from the user: ${instruction}\n\nContext (scan data):\n${JSON.stringify(context).slice(0, 40000)}\n\nReturn JSON {"title": string, "summary": string, "steps": string[], "files": [{"path": string, "lang": string, "code": string}]}. Write original code (Next.js + TypeScript + CSS modules unless the user asks otherwise). Never copy third-party code or images.`,
      { json: true, system: "You are READ, a senior engineer who reverse-engineers websites and writes clean original code.", maxTokens: 8192 },
    );
    const j = JSON.parse(out) as ActionResult;
    return { ...j, files: j.files ?? [], ai: true };
  } catch (e) {
    return { title: "Custom instruction", summary: "The AI request failed.", files: [], ai: false, aiError: e instanceof Error ? e.message : String(e) };
  }
}
