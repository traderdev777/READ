// "What it does": plain-English product breakdown inferred from the scan (no AI needed).
import type { ScanResult } from "./scan/page";
import type { DeepScan } from "./scan/browser";
import type { SitemapResult } from "./scan/sitemap";

export type Insight = {
  category: string; confidence: "high" | "medium" | "low"; oneLiner: string; valueProp: string | null;
  audience: string[]; offerings: string[]; userFlows: { name: string; steps: string[] }[]; monetisation: string[];
  pageTypes: string[]; integrations: { category: string; services: string[] }[];
  hosting: string | null; cdn: string | null;
  techSummary: string[];
  stackLayers: { layer: string; items: string[] }[];
};

const CATS: [string, RegExp][] = [
  ["Payments / fintech platform", /payment|payout|invoice|billing|banking|fintech|card issuing|upi|wallet|loan|credit/],
  ["E-commerce store", /add to cart|shop now|buy now|free shipping|checkout|collections?|products?\b.*₹|in stock/],
  ["Marketplace / classifieds", /sell your|buy and sell|listings?|used cars|marketplace|post an ad|dealers?|sellers?/],
  ["SaaS / software product", /free trial|sign up free|dashboard|workflow|integrations|api|platform|teams|automate|saas/],
  ["Developer tool / cloud", /deploy|developers?|sdk|cli|open source|github|infrastructure|hosting|serverless/],
  ["AI product", /\bai\b|artificial intelligence|llm|gpt|machine learning|copilot|agent/],
  ["Media / blog / news", /latest news|read more|articles?|subscribe to our newsletter|editorial|posts?/],
  ["Education / courses", /courses?|learn|students?|enrol|lessons?|certificate|tutor/],
  ["Healthcare", /doctor|clinic|patients?|health|appointment|hospital/],
  ["Travel / booking", /book now|hotels?|flights?|travel|tours?|stays?|reservations?/],
  ["Food / restaurant", /menu|order online|restaurant|delivery|dine/],
  ["Real estate", /properties|apartments?|rent|real estate|bhk|plots?/],
  ["Portfolio / agency", /portfolio|our work|case studies|agency|hire me|clients/],
  ["Community / social", /community|forum|members|followers|join the conversation/],
];

export function insight(q: ScanResult, d: DeepScan | null, s: SitemapResult | null): Insight {
  const text = [q.title, q.description, ...(d?.content.headings.map((h) => h.text) ?? q.structure.headings.map((h) => h.text)), ...(d?.content.ctas ?? []), ...q.structure.navLinks.map((l) => l.text)].join(" ").toLowerCase();
  const scored = CATS.map(([name, re]) => ({ name, n: (text.match(new RegExp(re.source, "g")) ?? []).length })).sort((a, b) => b.n - a.n);
  const top = scored[0];
  const category = top.n ? top.name : "Website";
  const confidence = top.n >= 4 && top.n > (scored[1]?.n ?? 0) * 1.5 ? "high" : top.n >= 2 ? "medium" : "low";
  const feats = new Set(d?.features.filter((f) => f.found).map((f) => f.name) ?? []);
  const h1 = d?.content.headings.find((h) => h.level === 1)?.text ?? q.structure.headings.find((h) => h.level === 1)?.text ?? null;
  const brand = (q.title ?? "").split(/[|\-–—:]/)[0].trim() || new URL(q.finalUrl).hostname.replace(/^www\./, "");

  const audience: string[] = [];
  if (/business|enterprise|teams|companies|b2b|startups?|dealers?|franchise/.test(text)) audience.push("Businesses (B2B)");
  if (/you|your|personal|families|customers|buyers|shoppers/.test(text)) audience.push("Consumers (B2C)");
  if (/developers?|api|sdk|docs/.test(text)) audience.push("Developers");
  if (/india|₹|inr|bengaluru|mumbai|delhi|hindi/.test(text) || q.lang?.includes("in")) audience.push("India market");

  const offerings = (d?.content.headings ?? q.structure.headings).filter((h) => h.level === 2 || h.level === 3).map((h) => h.text).filter((t) => t.length > 3 && t.length < 90).slice(0, 10);

  const userFlows: Insight["userFlows"] = [];
  if (feats.has("Sign up")) userFlows.push({ name: "Sign-up / onboarding", steps: ["Land on page", `Click "${d?.content.ctas.find((c) => /start|sign|join|create|try/i.test(c)) ?? "Sign up"}"`, "Create account", "Onboarding / dashboard"] });
  if (feats.has("Cart / checkout")) userFlows.push({ name: "Purchase", steps: ["Browse / search", "Product page", "Add to cart", "Checkout", "Payment"] });
  if (feats.has("Search") || feats.has("Filters / sorting")) userFlows.push({ name: "Discovery", steps: ["Search or filter", "Results list", "Detail page"] });
  if (feats.has("Contact form") || feats.has("WhatsApp") || feats.has("Click-to-call") || /contact sales|book a demo|talk to/.test(text)) userFlows.push({ name: "Lead capture", steps: ["Read value proposition", "Contact form / WhatsApp / call / demo request", "Sales follow-up"] });
  if (feats.has("Email capture")) userFlows.push({ name: "Newsletter / waitlist", steps: ["Enter email", "Confirmation"] });
  if (feats.has("Login / account")) userFlows.push({ name: "Returning user", steps: ["Log in", "Account area"] });

  const monetisation: string[] = [];
  if (feats.has("Pricing")) monetisation.push("Paid plans / listed prices");
  if (feats.has("Cart / checkout")) monetisation.push("Direct product sales");
  if (/contact sales|enterprise|custom pricing|book a demo/.test(text)) monetisation.push("Sales-led enterprise deals");
  if (/free trial|start for free|freemium|free plan/.test(text)) monetisation.push("Free trial / freemium funnel");
  if (d?.network.thirdParty.some((t) => t.category === "Advertising / pixels")) monetisation.push("Paid ads (tracking pixels present)");
  if (/commission|per transaction|fee/.test(text)) monetisation.push("Transaction fees / commission (inferred)");
  if (/franchise|partner|dealer/.test(text)) monetisation.push("Partner / franchise network");
  if (!monetisation.length) monetisation.push("Not visible on this page");

  const pageTypes = s?.templates.slice(0, 12).map((t) => t.pattern) ?? q.structure.navLinks.map((l) => l.text).slice(0, 10);

  const integ = new Map<string, Set<string>>();
  for (const t of d?.network.thirdParty ?? []) { if (!integ.has(t.category)) integ.set(t.category, new Set()); integ.get(t.category)!.add(t.host); }
  for (const r of d?.runtime ?? []) {
    const cat = /Analytics|Tag Manager|Hotjar|Clarity|Pixel/.test(r.name) ? "Analytics" : /Stripe|Razorpay/.test(r.name) ? "Payments" : /Sentry/.test(r.name) ? "Monitoring" : /Intercom/.test(r.name) ? "Chat / CRM" : /Firebase/.test(r.name) ? "Backend / SaaS" : null;
    if (cat) { if (!integ.has(cat)) integ.set(cat, new Set()); integ.get(cat)!.add(r.name); }
  }

  const h = d?.response.headers ?? {};
  const hosting = h["x-vercel-id"] || /vercel/i.test(h.server ?? "") ? "Vercel" : h["x-nf-request-id"] || /netlify/i.test(h.server ?? "") ? "Netlify" : h["x-github-request-id"] || /github/i.test(h.server ?? "") ? "GitHub Pages" : h["x-amz-cf-id"] || /amazon|awselb/i.test(h.server ?? "") ? "AWS" : /gws|gfe|google/i.test(h.server ?? "") || h["x-cloud-trace-context"] ? "Google Cloud" : h["x-azure-ref"] ? "Azure" : /nginx/i.test(h.server ?? "") ? "Own server (nginx)" : /apache/i.test(h.server ?? "") ? "Own server (Apache)" : h.server ? h.server : q.stack.find((x) => x.category === "Hosting")?.name ?? null;
  const cdn = h["cf-ray"] ? "Cloudflare" : h["x-amz-cf-id"] ? "CloudFront" : h["x-fastly-request-id"] || /fastly/i.test(h["x-served-by"] ?? "") ? "Fastly" : /akamai/i.test(JSON.stringify(h)) ? "Akamai" : h["x-vercel-cache"] ? "Vercel Edge" : null;

  const names = (cat: string) => q.stack.filter((x) => x.category === cat).map((x) => x.name);
  const rt = d?.runtime.map((r) => r.name + (r.version ? ` ${r.version}` : "")) ?? [];
  const fw = rt.filter((n) => /Next|Nuxt|React|Vue|Angular|Svelte|Astro|Gatsby|Remix|jQuery|Alpine|htmx/.test(n));
  const ui = [...rt.filter((n) => /Tailwind|Bootstrap|GSAP|Three|Lottie|Swiper|Framer Motion/.test(n)), ...names("CSS")];
  const cms = [...rt.filter((n) => /WordPress|Shopify|Wix|Webflow|Framer$/.test(n)), ...names("CMS")];
  const stackLayers = [
    { layer: "Framework", items: [...new Set([...fw, ...names("Framework")])] },
    { layer: "Languages", items: d?.code.languages ?? ["HTML", "CSS", "JavaScript"] },
    { layer: "Build tool", items: d?.code.bundler ? [d.code.bundler] : [] },
    { layer: "Rendering", items: d ? [d.code.rendering] : [] },
    { layer: "UI / animation", items: [...new Set(ui)] },
    { layer: "CMS / site builder", items: [...new Set(cms)] },
    { layer: "Fonts", items: d ? [...new Set(d.design.fonts.map((f) => f.family))].slice(0, 4) : q.design.fonts },
    { layer: "Hosting", items: hosting ? [hosting] : [] },
    { layer: "CDN", items: cdn ? [cdn] : [] },
    { layer: "npm packages (from public source maps)", items: d?.code.packages.slice(0, 20).map((p) => p.name) ?? [] },
    ...[...integ.entries()].map(([k, v]) => ({ layer: k, items: [...v].slice(0, 6) })),
  ].filter((l) => l.items.length);

  const techSummary: string[] = [];
  if (fw.length) techSummary.push(`Front end is built with ${fw.join(", ")}${d?.code.languages.includes("TypeScript") ? " in TypeScript" : ""}.`);
  if (d?.code.bundler) techSummary.push(`Code is bundled with ${d.code.bundler}; ${d.code.scripts.length} script files and ${d.code.stylesheets.length} stylesheets load on this page.`);
  if (d) techSummary.push(`${d.code.rendering}.`);
  if (hosting || cdn) techSummary.push(`Served from ${[hosting, cdn && cdn !== hosting ? `behind ${cdn}` : null].filter(Boolean).join(" ")}.`);
  if (d?.network.apiCalls.length) techSummary.push(`The page talks to ${d.network.apiCalls.length} API endpoints (XHR/fetch), e.g. ${d.network.apiCalls[0].url}.`);
  if (d?.code.sourceMaps.length) techSummary.push(`Public source maps expose ${d.code.sourceTree.length} original source files and ${d.code.packages.length} npm packages.`);
  if (integ.size) techSummary.push(`Third-party services: ${[...integ.keys()].join(", ")}.`);

  const oneLiner = `${brand} is a ${category.toLowerCase()}${audience.length ? ` for ${audience.filter((a) => a !== "India market").join(" and ").toLowerCase() || "users"}` : ""}${q.description ? `: ${q.description.length > 180 ? q.description.slice(0, 180).replace(/\s+\S*$/, "") + "…" : q.description}` : "."}`;
  return { category, confidence, oneLiner, valueProp: h1, audience, offerings, userFlows, monetisation, pageTypes, integrations: [...integ.entries()].map(([category, v]) => ({ category, services: [...v] })), hosting, cdn, techSummary, stackLayers };
}
