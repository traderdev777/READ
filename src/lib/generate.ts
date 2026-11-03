// READ generator (M4): scan + your changes -> a site model -> (a) instant HTML preview, (b) a Next.js project.
// "inspired" mode keeps structure and design ideas but uses your brand and fresh copy.
// "exact" mode (only for sites you own) also reuses the original page's own headings and text. Never images or code.
import type { ScanResult } from "./scan/page";
import type { DeepScan } from "./scan/browser";
import { aiEnabled, gemini } from "./ai/gemini";

export type GenerateInput = {
  brand: string;
  tagline?: string;
  primary?: string;
  changes?: string;
  mode: "inspired" | "exact";
  ownsSite?: boolean;
  dark?: boolean;
};

type Item = { title: string; text: string };
export type SiteModel = {
  brand: string;
  tagline: string;
  primary: string;
  dark: boolean;
  font: string;
  radius: string;
  nav: string[];
  hero: { eyebrow: string; headline: string; sub: string; cta: string; secondary: string };
  logos: string[];
  features: { title: string; items: Item[] };
  steps: { title: string; items: Item[] } | null;
  stats: { value: string; label: string }[];
  testimonials: { quote: string; name: string; role: string }[];
  pricing: { name: string; price: string; period: string; features: string[]; highlight?: boolean }[];
  faq: Item[];
  cta: { title: string; text: string; button: string };
  footer: { columns: { title: string; links: string[] }[]; note: string };
  pages: { slug: string; title: string; intro: string }[];
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "page";
const SAFE_FONTS = ["Inter", "system-ui", "Roboto", "Poppins", "Montserrat", "Lato", "Open Sans", "DM Sans", "Manrope", "Plus Jakarta Sans", "Source Sans 3", "Nunito", "Work Sans", "IBM Plex Sans", "Space Grotesk", "Outfit", "Rubik"];

function rgbToHex(c: string) {
  const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return c.startsWith("#") ? c : null;
  return "#" + [m[1], m[2], m[3]].map((n) => (+n).toString(16).padStart(2, "0")).join("");
}

function pickPrimary(d: DeepScan | null): string {
  for (const b of d?.design.buttons ?? []) {
    const hex = rgbToHex(b.bg);
    if (hex && !/^#(f{6}|0{6}|f8fafc|f1f5f9)$/i.test(hex) && !/rgba\(.*, 0\)/.test(b.bg)) return hex;
  }
  return "#6d28d9";
}

export function baseModel(q: ScanResult, d: DeepScan | null, input: GenerateInput): SiteModel {
  const exact = input.mode === "exact" && input.ownsSite;
  const brand = input.brand.trim() || "Your Brand";
  const feats = d?.features.filter((f) => f.found).map((f) => f.name) ?? [];
  const nav = (q.structure.navLinks.map((l) => l.text).filter((t) => t.length < 22).slice(0, 5));
  const headings = q.structure.headings.map((h) => h.text);
  const hf = d?.design.headingFont ?? null;
  const font = hf && SAFE_FONTS.find((f) => hf.toLowerCase().includes(f.toLowerCase())) || "Inter";
  const br = d?.design.buttons.find((b) => b.radius && b.radius !== "0px")?.radius;
  const radius = br ?? "12px";
  const sectionHeads = (exact ? headings.slice(1, 8) : []);
  const featureItems: Item[] = (exact && sectionHeads.length >= 3 ? sectionHeads.slice(0, 6) : ["Fast to start", "Built for mobile", "Secure by default", "Insightful analytics", "Works with your tools", "Real human support"])
    .map((t) => ({ title: t, text: exact ? "" : `Describe how ${brand} delivers ${t.toLowerCase()} in a sentence your customers would care about.` }));
  return {
    brand,
    tagline: input.tagline?.trim() || (exact ? q.description ?? "" : `${brand} makes it simple.`),
    primary: input.primary || pickPrimary(d),
    dark: !!input.dark,
    font,
    radius,
    nav: nav.length >= 3 && exact ? nav : ["Product", "Features", "Pricing", "About", "Contact"].filter((n) => n !== "Pricing" || feats.includes("Pricing")),
    hero: {
      eyebrow: exact ? "" : "New",
      headline: exact ? headings[0] ?? brand : `${input.tagline?.trim() || `The better way to get it done`}`,
      sub: exact ? q.description ?? "" : `${brand} gives you everything you need in one place, without the clutter.`,
      cta: feats.includes("Sign up") ? "Get started" : "Contact us",
      secondary: "Learn more",
    },
    logos: [],
    features: { title: exact ? sectionHeads[0] ?? "Features" : `Why ${brand}`, items: featureItems },
    steps: { title: "How it works", items: [{ title: "Sign up", text: "Create your account in under a minute." }, { title: "Set it up", text: "Tell us what you need. We handle the rest." }, { title: "Grow", text: "Track results and keep improving." }] },
    stats: [{ value: "10k+", label: "Customers" }, { value: "99.9%", label: "Uptime" }, { value: "4.8★", label: "Average rating" }],
    testimonials: feats.includes("Reviews / testimonials") ? [{ quote: `${brand} saved us hours every week.`, name: "Customer name", role: "Role, Company" }, { quote: "Setup took minutes, not days.", name: "Customer name", role: "Role, Company" }] : [],
    pricing: feats.includes("Pricing") ? [
      { name: "Starter", price: "₹0", period: "/month", features: ["Core features", "Email support"] },
      { name: "Pro", price: "₹999", period: "/month", features: ["Everything in Starter", "Advanced tools", "Priority support"], highlight: true },
      { name: "Business", price: "Custom", period: "", features: ["Everything in Pro", "SSO & audit logs", "Dedicated manager"] },
    ] : [],
    faq: feats.includes("FAQ / accordion") ? [
      { title: `What is ${brand}?`, text: input.tagline || `${brand} is a product that helps you get more done.` },
      { title: "How much does it cost?", text: "Start free, upgrade when you're ready." },
      { title: "Can I cancel anytime?", text: "Yes, no lock-in." },
    ] : [],
    cta: { title: `Ready to try ${brand}?`, text: "Join thousands of happy customers today.", button: feats.includes("Sign up") ? "Get started free" : "Talk to us" },
    footer: { columns: [{ title: "Product", links: ["Features", "Pricing", "Changelog"] }, { title: "Company", links: ["About", "Careers", "Contact"] }, { title: "Legal", links: ["Privacy", "Terms"] }], note: `© ${new Date().getFullYear()} ${brand}. All rights reserved.` },
    pages: ["About", "Contact"].map((t) => ({ slug: slug(t), title: t, intro: `${t} ${brand}.` })),
  };
}

async function aiModel(q: ScanResult, d: DeepScan | null, input: GenerateInput, base: SiteModel): Promise<SiteModel> {
  const ref = {
    title: q.title, description: q.description, headings: q.structure.headings, nav: q.structure.navLinks.map((n) => n.text),
    features: d?.features.filter((f) => f.found).map((f) => f.name), sections: d?.layout.sections, stack: q.stack.map((s) => s.name),
  };
  const rules = input.mode === "exact" && input.ownsSite
    ? "The user OWNS the reference site: you may reuse its own headings and wording."
    : "INSPIRED mode: mirror the reference's structure, section order and feature set, but write 100% original copy for the user's brand. Never reuse the reference's brand name, slogans or distinctive sentences.";
  const out = await gemini(
    `Reference site analysis:\n${JSON.stringify(ref).slice(0, 30000)}\n\nUser's brand: ${input.brand}\nTagline: ${input.tagline || "(write one)"}\nRequested changes: ${input.changes || "(none)"}\n${rules}\n\n` +
    `Return JSON matching exactly this TypeScript type, filled with realistic, specific copy (no lorem ipsum). Keep primary/font/radius from the starting model unless the changes ask otherwise. Omit sections that don't fit by using empty arrays / null.\n` +
    `type SiteModel = ${JSON.stringify(base)}\n(the object above is the starting model, use its shape)`,
    { json: true, system: "You are READ's product generator. Output only valid JSON.", maxTokens: 8192 },
  );
  const m = JSON.parse(out) as SiteModel;
  return { ...base, ...m, hero: { ...base.hero, ...m.hero }, cta: { ...base.cta, ...m.cta }, footer: { ...base.footer, ...m.footer } };
}

export async function buildModel(q: ScanResult, d: DeepScan | null, input: GenerateInput): Promise<{ model: SiteModel; ai: boolean; aiError?: string }> {
  const base = baseModel(q, d, input);
  if (!aiEnabled()) return { model: base, ai: false };
  try { return { model: await aiModel(q, d, input, base), ai: true }; }
  catch (e) { return { model: base, ai: false, aiError: e instanceof Error ? e.message : String(e) }; }
}

// ---------- shared CSS ----------
export function css(m: SiteModel) {
  const bg = m.dark ? "#0b0f19" : "#ffffff", fg = m.dark ? "#e5e7eb" : "#0f172a", muted = m.dark ? "#94a3b8" : "#64748b", surface = m.dark ? "#111827" : "#f8fafc", line = m.dark ? "#1f2937" : "#e2e8f0";
  return `:root{--primary:${m.primary};--bg:${bg};--fg:${fg};--muted:${muted};--surface:${surface};--line:${line};--radius:${m.radius};--font:'${m.font}',system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
*{box-sizing:border-box;margin:0;padding:0}html{scroll-behavior:smooth}body{font-family:var(--font);background:var(--bg);color:var(--fg);line-height:1.6;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}.wrap{max-width:1120px;margin:0 auto;padding:0 20px}
.hdr{position:sticky;top:0;z-index:10;background:color-mix(in srgb,var(--bg) 85%,transparent);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
.hdr .wrap{display:flex;align-items:center;justify-content:space-between;height:64px}.logo{font-weight:800;font-size:20px;letter-spacing:-.02em}.logo span{color:var(--primary)}
.nav{display:flex;gap:24px;color:var(--muted);font-size:15px}.nav a:hover{color:var(--fg)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 22px;border-radius:var(--radius);background:var(--primary);color:#fff;font-weight:600;border:0;cursor:pointer;transition:transform .15s,box-shadow .15s}.btn:hover{transform:translateY(-1px);box-shadow:0 8px 24px color-mix(in srgb,var(--primary) 35%,transparent)}
.btn.ghost{background:transparent;color:var(--fg);border:1px solid var(--line)}
.hero{padding:96px 0 72px;text-align:center;background:radial-gradient(60% 50% at 50% 0%,color-mix(in srgb,var(--primary) 16%,transparent),transparent)}
.eyebrow{display:inline-block;padding:4px 12px;border-radius:999px;background:color-mix(in srgb,var(--primary) 12%,transparent);color:var(--primary);font-size:13px;font-weight:600;margin-bottom:18px}
.hero h1{font-size:clamp(36px,6vw,64px);line-height:1.05;letter-spacing:-.03em;max-width:820px;margin:0 auto 18px}.hero p{font-size:clamp(17px,2vw,20px);color:var(--muted);max-width:640px;margin:0 auto 32px}
.ctas{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
section{padding:80px 0}.sec-title{font-size:clamp(28px,4vw,40px);letter-spacing:-.02em;text-align:center;margin-bottom:40px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px}
.card{background:var(--surface);border:1px solid var(--line);border-radius:calc(var(--radius) + 4px);padding:24px}.card h3{font-size:18px;margin-bottom:8px}.card p{color:var(--muted)}
.icon{width:40px;height:40px;border-radius:10px;background:color-mix(in srgb,var(--primary) 14%,transparent);color:var(--primary);display:grid;place-items:center;font-weight:800;margin-bottom:14px}
.stats{display:flex;justify-content:center;gap:56px;flex-wrap:wrap;text-align:center}.stats b{display:block;font-size:40px;color:var(--primary);letter-spacing:-.02em}.stats span{color:var(--muted)}
.price{display:flex;flex-direction:column;gap:14px}.price.hl{border-color:var(--primary);box-shadow:0 0 0 2px var(--primary)}.price .amt{font-size:36px;font-weight:800}.price .amt small{font-size:15px;color:var(--muted);font-weight:500}.price ul{list-style:none;color:var(--muted);display:grid;gap:6px}.price li:before{content:"✓ ";color:var(--primary)}
blockquote{font-size:18px}.who{margin-top:14px;color:var(--muted);font-size:14px}
details{border-bottom:1px solid var(--line);padding:18px 0}summary{cursor:pointer;font-weight:600;font-size:17px}details p{color:var(--muted);margin-top:10px}
.cta{background:var(--primary);color:#fff;border-radius:calc(var(--radius) + 12px);padding:56px 24px;text-align:center}.cta p{opacity:.9;margin:10px 0 24px}.cta .btn{background:#fff;color:var(--primary)}
.ftr{border-top:1px solid var(--line);padding:48px 0;color:var(--muted);font-size:14px}.ftr .cols{display:grid;grid-template-columns:2fr repeat(3,1fr);gap:24px;margin-bottom:28px}.ftr h4{color:var(--fg);margin-bottom:10px}.ftr li{list-style:none;margin:6px 0}
.page{padding:96px 0;min-height:60vh}.page h1{font-size:44px;margin-bottom:12px}
@media(max-width:720px){.nav{display:none}.ftr .cols{grid-template-columns:1fr 1fr}.hero{padding:64px 0 48px}section{padding:56px 0}}`;
}

// ---------- HTML preview ----------
export function renderHtml(m: SiteModel): string {
  const logo = `${esc(m.brand.slice(0, -1))}<span>${esc(m.brand.slice(-1))}</span>`;
  const gf = m.font !== "system-ui" ? `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(m.font)}:wght@400;500;600;700;800&display=swap">` : "";
  const S: string[] = [];
  S.push(`<header class="hdr"><div class="wrap"><a class="logo" href="#">${logo}</a><nav class="nav">${m.nav.map((n) => `<a href="#${slug(n)}">${esc(n)}</a>`).join("")}</nav><a class="btn" href="#cta">${esc(m.hero.cta)}</a></div></header>`);
  S.push(`<section class="hero"><div class="wrap">${m.hero.eyebrow ? `<span class="eyebrow">${esc(m.hero.eyebrow)}</span>` : ""}<h1>${esc(m.hero.headline)}</h1><p>${esc(m.hero.sub)}</p><div class="ctas"><a class="btn" href="#cta">${esc(m.hero.cta)}</a><a class="btn ghost" href="#features">${esc(m.hero.secondary)}</a></div></div></section>`);
  if (m.stats.length) S.push(`<section style="padding:32px 0"><div class="wrap stats">${m.stats.map((s) => `<div><b>${esc(s.value)}</b><span>${esc(s.label)}</span></div>`).join("")}</div></section>`);
  if (m.features.items.length) S.push(`<section id="features"><div class="wrap"><h2 class="sec-title">${esc(m.features.title)}</h2><div class="grid">${m.features.items.map((f, i) => `<div class="card"><div class="icon">${i + 1}</div><h3>${esc(f.title)}</h3>${f.text ? `<p>${esc(f.text)}</p>` : ""}</div>`).join("")}</div></div></section>`);
  if (m.steps?.items.length) S.push(`<section style="background:var(--surface)"><div class="wrap"><h2 class="sec-title">${esc(m.steps.title)}</h2><div class="grid">${m.steps.items.map((f, i) => `<div class="card" style="background:var(--bg)"><div class="icon">${i + 1}</div><h3>${esc(f.title)}</h3><p>${esc(f.text)}</p></div>`).join("")}</div></div></section>`);
  if (m.testimonials.length) S.push(`<section><div class="wrap"><h2 class="sec-title">Loved by customers</h2><div class="grid">${m.testimonials.map((t) => `<div class="card"><blockquote>“${esc(t.quote)}”</blockquote><div class="who"><b>${esc(t.name)}</b> · ${esc(t.role)}</div></div>`).join("")}</div></div></section>`);
  if (m.pricing.length) S.push(`<section id="pricing"><div class="wrap"><h2 class="sec-title">Pricing</h2><div class="grid">${m.pricing.map((p) => `<div class="card price${p.highlight ? " hl" : ""}"><h3>${esc(p.name)}</h3><div class="amt">${esc(p.price)}<small>${esc(p.period)}</small></div><ul>${p.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul><a class="btn${p.highlight ? "" : " ghost"}" href="#cta">Choose ${esc(p.name)}</a></div>`).join("")}</div></div></section>`);
  if (m.faq.length) S.push(`<section id="faq"><div class="wrap" style="max-width:760px"><h2 class="sec-title">FAQ</h2>${m.faq.map((f) => `<details><summary>${esc(f.title)}</summary><p>${esc(f.text)}</p></details>`).join("")}</div></section>`);
  S.push(`<section id="cta"><div class="wrap"><div class="cta"><h2 class="sec-title" style="margin:0;color:#fff">${esc(m.cta.title)}</h2><p>${esc(m.cta.text)}</p><a class="btn" href="#">${esc(m.cta.button)}</a></div></div></section>`);
  S.push(`<footer class="ftr"><div class="wrap"><div class="cols"><div><div class="logo">${logo}</div><p style="margin-top:8px">${esc(m.tagline)}</p></div>${m.footer.columns.map((c) => `<div><h4>${esc(c.title)}</h4><ul>${c.links.map((l) => `<li><a href="#">${esc(l)}</a></li>`).join("")}</ul></div>`).join("")}</div><p>${esc(m.footer.note)}</p></div></footer>`);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(m.brand)} — ${esc(m.tagline)}</title><meta name="description" content="${esc(m.hero.sub)}">${gf}<style>${css(m)}</style></head><body>${S.join("\n")}</body></html>`;
}

// ---------- Next.js project ----------
export function nextProject(m: SiteModel): Record<string, string> {
  const pkg = m.brand.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "my-site";
  const data = JSON.stringify(m, null, 2);
  const files: Record<string, string> = {};
  files["package.json"] = JSON.stringify({
    name: pkg, version: "0.1.0", private: true,
    scripts: { dev: "next dev", build: "next build", start: "next start" },
    dependencies: { next: "^16.0.0", react: "^19.0.0", "react-dom": "^19.0.0" },
    devDependencies: { typescript: "^5", "@types/node": "^20", "@types/react": "^19", "@types/react-dom": "^19" },
  }, null, 2);
  files["next.config.ts"] = `import type { NextConfig } from "next";\n\n// output: "export" lets you host this on GitHub Pages, Netlify or any static host.\nconst nextConfig: NextConfig = { output: "export", images: { unoptimized: true } };\nexport default nextConfig;\n`;
  files["tsconfig.json"] = JSON.stringify({ compilerOptions: { target: "ES2020", lib: ["dom", "dom.iterable", "esnext"], allowJs: false, skipLibCheck: true, strict: true, noEmit: true, esModuleInterop: true, module: "esnext", moduleResolution: "bundler", resolveJsonModule: true, isolatedModules: true, jsx: "react-jsx", incremental: true, plugins: [{ name: "next" }], paths: { "@/*": ["./src/*"] } }, include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"], exclude: ["node_modules"] }, null, 2);
  files[".gitignore"] = "node_modules\n.next\nout\n.env*\n";
  files["src/content/site.json"] = data;
  files["src/app/globals.css"] = css(m).replace(/\}/g, "}\n");
  files["src/app/layout.tsx"] = `import type { Metadata } from "next";
import "./globals.css";
import site from "@/content/site.json";
import { Header, Footer } from "@/components/Chrome";

export const metadata: Metadata = { title: \`\${site.brand} — \${site.tagline}\`, description: site.hero.sub };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href={\`https://fonts.googleapis.com/css2?family=\${encodeURIComponent(site.font)}:wght@400;500;600;700;800&display=swap\`} />
      </head>
      <body>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
`;
  files["src/components/Chrome.tsx"] = `import Link from "next/link";
import site from "@/content/site.json";

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export function Logo() {
  return <Link className="logo" href="/">{site.brand.slice(0, -1)}<span>{site.brand.slice(-1)}</span></Link>;
}

export function Header() {
  return (
    <header className="hdr">
      <div className="wrap">
        <Logo />
        <nav className="nav">{site.nav.map((n) => <a key={n} href={\`/#\${slug(n)}\`}>{n}</a>)}</nav>
        <a className="btn" href="/#cta">{site.hero.cta}</a>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="ftr">
      <div className="wrap">
        <div className="cols">
          <div><Logo /><p style={{ marginTop: 8 }}>{site.tagline}</p></div>
          {site.footer.columns.map((c) => (
            <div key={c.title}><h4>{c.title}</h4><ul>{c.links.map((l) => <li key={l}><a href="#">{l}</a></li>)}</ul></div>
          ))}
        </div>
        <p>{site.footer.note}</p>
      </div>
    </footer>
  );
}
`;
  files["src/components/Sections.tsx"] = `import site from "@/content/site.json";

type Item = { title: string; text: string };

export function Hero() {
  const h = site.hero;
  return (
    <section className="hero"><div className="wrap">
      {h.eyebrow && <span className="eyebrow">{h.eyebrow}</span>}
      <h1>{h.headline}</h1><p>{h.sub}</p>
      <div className="ctas"><a className="btn" href="#cta">{h.cta}</a><a className="btn ghost" href="#features">{h.secondary}</a></div>
    </div></section>
  );
}

export function Stats() {
  if (!site.stats.length) return null;
  return <section style={{ padding: "32px 0" }}><div className="wrap stats">{site.stats.map((s) => <div key={s.label}><b>{s.value}</b><span>{s.label}</span></div>)}</div></section>;
}

function Cards({ items, alt }: { items: Item[]; alt?: boolean }) {
  return <div className="grid">{items.map((f, i) => <div className="card" key={f.title} style={alt ? { background: "var(--bg)" } : undefined}><div className="icon">{i + 1}</div><h3>{f.title}</h3>{f.text && <p>{f.text}</p>}</div>)}</div>;
}

export function Features() {
  if (!site.features.items.length) return null;
  return <section id="features"><div className="wrap"><h2 className="sec-title">{site.features.title}</h2><Cards items={site.features.items} /></div></section>;
}

export function Steps() {
  const s = site.steps as { title: string; items: Item[] } | null;
  if (!s?.items.length) return null;
  return <section style={{ background: "var(--surface)" }}><div className="wrap"><h2 className="sec-title">{s.title}</h2><Cards items={s.items} alt /></div></section>;
}

export function Testimonials() {
  const t = site.testimonials as { quote: string; name: string; role: string }[];
  if (!t.length) return null;
  return <section><div className="wrap"><h2 className="sec-title">Loved by customers</h2><div className="grid">{t.map((x, i) => <div className="card" key={i}><blockquote>“{x.quote}”</blockquote><div className="who"><b>{x.name}</b> · {x.role}</div></div>)}</div></div></section>;
}

export function Pricing() {
  const p = site.pricing as { name: string; price: string; period: string; features: string[]; highlight?: boolean }[];
  if (!p.length) return null;
  return (
    <section id="pricing"><div className="wrap"><h2 className="sec-title">Pricing</h2><div className="grid">
      {p.map((t) => (
        <div key={t.name} className={\`card price\${t.highlight ? " hl" : ""}\`}>
          <h3>{t.name}</h3><div className="amt">{t.price}<small>{t.period}</small></div>
          <ul>{t.features.map((f) => <li key={f}>{f}</li>)}</ul>
          <a className={\`btn\${t.highlight ? "" : " ghost"}\`} href="#cta">Choose {t.name}</a>
        </div>
      ))}
    </div></div></section>
  );
}

export function Faq() {
  if (!site.faq.length) return null;
  return <section id="faq"><div className="wrap" style={{ maxWidth: 760 }}><h2 className="sec-title">FAQ</h2>{site.faq.map((f) => <details key={f.title}><summary>{f.title}</summary><p>{f.text}</p></details>)}</div></section>;
}

export function Cta() {
  const c = site.cta;
  return <section id="cta"><div className="wrap"><div className="cta"><h2 className="sec-title" style={{ margin: 0, color: "#fff" }}>{c.title}</h2><p>{c.text}</p><a className="btn" href="#">{c.button}</a></div></div></section>;
}
`;
  files["src/app/page.tsx"] = `import { Hero, Stats, Features, Steps, Testimonials, Pricing, Faq, Cta } from "@/components/Sections";

export default function Home() {
  return (
    <main>
      <Hero />
      <Stats />
      <Features />
      <Steps />
      <Testimonials />
      <Pricing />
      <Faq />
      <Cta />
    </main>
  );
}
`;
  for (const p of m.pages) {
    files[`src/app/${p.slug}/page.tsx`] = `export const metadata = { title: ${JSON.stringify(p.title)} };

export default function Page() {
  return (
    <main className="page"><div className="wrap">
      <h1>${p.title.replace(/[<>{}]/g, "")}</h1>
      <p style={{ color: "var(--muted)" }}>${p.intro.replace(/[<>{}]/g, "")}</p>
    </div></main>
  );
}
`;
  }
  files["README.md"] = `# ${m.brand}\n\nGenerated with **READ** (Reverse Engineering Anything and Develop).\n\nAll copy lives in \`src/content/site.json\`. Edit it, and the site updates.\n\n\`\`\`bash\nnpm install\nnpm run dev     # http://localhost:3000\nnpm run build   # static site in ./out\n\`\`\`\n\nBefore launch: replace placeholder testimonials, stats and prices with real ones, and add your own images.\n`;
  return files;
}
