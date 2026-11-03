// READ Build Studio: the blueprint (what the reference has, what we suggest) and the questions asked at each step.
import type { ScanResult } from "../scan/page";
import type { DeepScan } from "../scan/browser";
import type { Insight } from "../insight";

export type FieldType = "text" | "longtext" | "number" | "money" | "bool" | "date" | "image" | "url" | "select";
export type Field = { name: string; label: string; type: FieldType; required?: boolean; options?: string[]; filter?: boolean };
export type Entity = { name: string; plural: string; fields: Field[]; visibility: "public" | "private" };

export type Features = {
  auth: boolean; googleAuth: boolean; dashboard: boolean; admin: boolean; search: boolean; favorites: boolean; reviews: boolean;
  contact: boolean; newsletter: boolean; blog: boolean; payments: "none" | "razorpay" | "stripe"; uploads: boolean; email: boolean;
  darkMode: boolean; seo: boolean; pwa: boolean; whatsapp: boolean; analytics: "none" | "ga" | "plausible"; marketData: boolean;
};
export type Tech = { db: "sqlite" | "postgres"; hosting: "vercel" | "render" | "docker" };
export type Design = { primary: string; font: string; dark: boolean; radius: string };
export type Plan = { name: string; price: number; period: "month" | "year" | "once"; perks: string[] };
export type Spec = {
  name: string; tagline: string; description: string; audience: string; category: string; whatsappNumber?: string;
  entities: Entity[]; features: Features; tech: Tech; design: Design; plans: Plan[];
  referenceUrl?: string; referenceTitle?: string;
};

export type Capability = {
  key: keyof Features | "core"; label: string; refHas: boolean; evidence: string; suggest: boolean; why: string;
  options?: { value: string; label: string; pros: string; cons: string }[];
};
export type TechChoice = { key: string; label: string; reference: string; options: { value: string; label: string; pros: string; cons: string; recommended?: boolean }[] };
export type Question = { id: string; step: string; ask: string; hint?: string };
export type Blueprint = { spec: Spec; capabilities: Capability[]; techChoices: TechChoice[]; questions: Question[]; referenceStack: { layer: string; items: string[] }[] };

const f = (name: string, label: string, type: FieldType, extra: Partial<Field> = {}): Field => ({ name, label, type, ...extra });

// Starting data model for each kind of product. The user edits it in step 2.
export const PRESETS: Record<string, Entity[]> = {
  "Marketplace / classifieds": [{ name: "Listing", plural: "Listings", visibility: "public", fields: [f("title", "Title", "text", { required: true }), f("price", "Price", "money", { required: true, filter: true }), f("category", "Category", "select", { options: ["Hatchback", "Sedan", "SUV", "Other"], filter: true }), f("location", "Location", "text", { filter: true }), f("image", "Photo", "image"), f("description", "Description", "longtext")] }],
  "E-commerce store": [{ name: "Product", plural: "Products", visibility: "public", fields: [f("title", "Name", "text", { required: true }), f("price", "Price", "money", { required: true, filter: true }), f("category", "Category", "select", { options: ["New", "Popular", "Sale"], filter: true }), f("stock", "Stock", "number"), f("image", "Photo", "image"), f("description", "Description", "longtext")] }],
  "Trading / investing": [
    { name: "Stock", plural: "Stocks", visibility: "public", fields: [f("title", "Symbol", "text", { required: true }), f("company", "Company", "text", { required: true }), f("exchange", "Exchange", "select", { options: ["NSE", "BSE", "NASDAQ", "NYSE"], filter: true }), f("sector", "Sector", "select", { options: ["Banking", "IT", "Energy", "Pharma", "Auto", "FMCG", "Other"], filter: true }), f("price", "Last price", "money", { filter: true }), f("description", "Notes", "longtext")] },
    { name: "Trade", plural: "Trades", visibility: "private", fields: [f("title", "Symbol", "text", { required: true }), f("side", "Side", "select", { options: ["Buy", "Sell"], required: true, filter: true }), f("quantity", "Quantity", "number", { required: true }), f("price", "Price", "money", { required: true }), f("tradedAt", "Date", "date", { required: true }), f("strategy", "Strategy", "select", { options: ["Intraday", "Swing", "Positional", "Options"], filter: true }), f("description", "Notes", "longtext")] },
  ],
  "SaaS / software product": [{ name: "Project", plural: "Projects", visibility: "private", fields: [f("title", "Name", "text", { required: true }), f("status", "Status", "select", { options: ["Planned", "Active", "Done"], filter: true }), f("dueDate", "Due date", "date"), f("description", "Description", "longtext")] }],
  "Education / courses": [{ name: "Course", plural: "Courses", visibility: "public", fields: [f("title", "Title", "text", { required: true }), f("price", "Price", "money", { filter: true }), f("level", "Level", "select", { options: ["Beginner", "Intermediate", "Advanced"], filter: true }), f("image", "Cover", "image"), f("description", "Description", "longtext")] }],
  "Real estate": [{ name: "Property", plural: "Properties", visibility: "public", fields: [f("title", "Title", "text", { required: true }), f("price", "Price", "money", { required: true, filter: true }), f("type", "Type", "select", { options: ["1 BHK", "2 BHK", "3 BHK", "Villa", "Plot"], filter: true }), f("location", "Location", "text", { filter: true }), f("image", "Photo", "image"), f("description", "Description", "longtext")] }],
  "Media / blog / news": [{ name: "Article", plural: "Articles", visibility: "public", fields: [f("title", "Title", "text", { required: true }), f("topic", "Topic", "select", { options: ["News", "Guides", "Opinion"], filter: true }), f("image", "Cover", "image"), f("description", "Body", "longtext", { required: true })] }],
  default: [{ name: "Item", plural: "Items", visibility: "public", fields: [f("title", "Title", "text", { required: true }), f("category", "Category", "select", { options: ["General", "Featured"], filter: true }), f("image", "Image", "image"), f("description", "Description", "longtext")] }],
};

export function blueprint(q: ScanResult, d: DeepScan | null, about: Insight): Blueprint {
  const feats = new Set(d?.features.filter((x) => x.found).map((x) => x.name) ?? []);
  const text = [q.title, q.description, ...(d?.content.headings.map((h) => h.text) ?? [])].join(" ").toLowerCase();
  const tp = (cat: string) => d?.network.thirdParty.some((t) => t.category === cat) ?? false;
  const rt = (re: RegExp) => d?.runtime.some((r) => re.test(r.name)) ?? false;
  const trading = /trad(e|ing)|stock|nifty|sensex|invest|demat|options|f&o|crypto|broker/.test(text);
  const category = trading ? "Trading / investing" : about.category;
  const preset = PRESETS[category] ?? PRESETS.default;
  const brand = (q.title ?? "").split(/[|\-–—:]/)[0].trim();

  const cap = (key: Capability["key"], label: string, refHas: boolean, evidence: string, suggest: boolean, why: string, options?: Capability["options"]): Capability => ({ key, label, refHas, evidence, suggest, why, options });
  const capabilities: Capability[] = [
    cap("auth", "Sign up / log in", feats.has("Sign up") || feats.has("Login / account"), feats.has("Login / account") ? "Login link found" : "No login on the page", true, "Needed for dashboards, saved items and anything users own."),
    cap("googleAuth", "Google sign-in", /google/.test(JSON.stringify(d?.network.thirdParty ?? [])) && feats.has("Login / account"), "Google auth scripts", false, "Faster sign-up; needs a Google OAuth client ID."),
    cap("dashboard", "User dashboard", feats.has("Login / account"), "Account area implied by login", true, "Where users manage their own data."),
    cap("admin", "Admin panel", false, "Not visible from outside (usually private)", true, "You need it to moderate users, content, leads and payments."),
    cap("search", "Search and filters", feats.has("Search") || feats.has("Filters / sorting"), feats.has("Search") ? "Search box found" : "No search found", preset.some((e) => e.visibility === "public"), "Users find things faster; filters come from your select/price fields."),
    cap("favorites", "Save / watchlist", /wishlist|watchlist|save|favourite|favorite|heart/.test(text) || feats.has("Cart / checkout"), "Save/heart icons", true, trading ? "A watchlist is core for trading users." : "Brings users back."),
    cap("reviews", "Ratings and reviews", feats.has("Reviews / testimonials"), feats.has("Reviews / testimonials") ? "Testimonials section" : "None found", category !== "Trading / investing", "Social proof on each item."),
    cap("contact", "Contact / lead form", feats.has("Contact form") || feats.has("WhatsApp") || feats.has("Click-to-call"), "Contact options found", true, "Leads are saved in the admin panel."),
    cap("whatsapp", "WhatsApp button", feats.has("WhatsApp"), feats.has("WhatsApp") ? "wa.me link found" : "None", /india|₹/.test(text) || feats.has("WhatsApp"), "Most-used contact channel in India."),
    cap("newsletter", "Newsletter / email capture", feats.has("Email capture"), feats.has("Email capture") ? "Email input found" : "None", true, "Own your audience."),
    cap("blog", "Blog / articles", feats.has("Blog / articles") || (about.pageTypes.some((p) => /blog|news|article|learn/.test(p))), "Blog links or templates", true, "SEO traffic; admin can write posts."),
    cap("payments", "Payments", feats.has("Cart / checkout") || rt(/Stripe|Razorpay/) || tp("Payments"), rt(/Razorpay/) ? "Razorpay detected" : rt(/Stripe/) ? "Stripe detected" : feats.has("Pricing") ? "Pricing shown" : "No payments found", feats.has("Pricing") || feats.has("Cart / checkout"), "Charge for plans or orders.", [
      { value: "razorpay", label: "Razorpay", pros: "UPI, cards, netbanking; best for India; INR payouts", cons: "India-focused" },
      { value: "stripe", label: "Stripe", pros: "Global cards, great docs, subscriptions", cons: "Limited UPI; India accounts are invite-based for some features" },
      { value: "none", label: "No payments yet", pros: "Ship faster", cons: "No revenue in-app" },
    ]),
    cap("uploads", "Image uploads", preset.some((e) => e.fields.some((x) => x.type === "image")), "Item photos on the page", preset.some((e) => e.fields.some((x) => x.type === "image")), "Users upload photos for their items."),
    cap("email", "Email notifications", false, "Not visible from outside", false, "Welcome and lead alerts; needs an SMTP/Resend key."),
    cap("marketData", "Live market data", trading && (d?.network.apiCalls.length ?? 0) > 0, trading ? `${d?.network.apiCalls.length ?? 0} API calls on load` : "Not a trading site", trading, "Real quotes from a market-data API (Finnhub / Twelve Data key).", [
      { value: "finnhub", label: "Finnhub", pros: "Free tier, US + some global", cons: "Indian NSE coverage limited on free plan" },
      { value: "twelvedata", label: "Twelve Data", pros: "NSE/BSE symbols, free 800 calls/day", cons: "Rate limits" },
    ]),
    cap("darkMode", "Dark mode", feats.has("Dark mode toggle"), feats.has("Dark mode toggle") ? "Theme toggle found" : "None", true, "Expected by users today."),
    cap("seo", "SEO (sitemap, metadata, schema)", !!d?.seo.og.title && !!d?.seo.canonical, d ? `OG ${d.seo.og.title ? "yes" : "no"}, canonical ${d.seo.canonical ? "yes" : "no"}, JSON-LD ${d.seo.jsonLdTypes.length}` : "", true, "Generated sitemap.xml, robots.txt, per-page metadata."),
    cap("pwa", "Installable app (PWA)", !!d?.seo.manifest, d?.seo.manifest ? "Manifest found" : "No manifest", true, "Add to home screen on phones."),
    cap("analytics", "Analytics", rt(/Google Analytics|Tag Manager|Plausible/) || tp("Analytics"), rt(/Google Analytics|Tag Manager/) ? "Google Analytics/GTM" : tp("Analytics") ? "Analytics scripts" : "None", true, "Know what users do.", [
      { value: "plausible", label: "Plausible", pros: "Privacy-friendly, no cookie banner", cons: "Paid after trial" },
      { value: "ga", label: "Google Analytics 4", pros: "Free, powerful", cons: "Cookie consent needed" },
      { value: "none", label: "None", pros: "", cons: "" },
    ]),
  ];

  const features: Features = {
    auth: true, googleAuth: false, dashboard: true, admin: true,
    search: capabilities.find((c) => c.key === "search")!.suggest, favorites: true, reviews: category !== "Trading / investing",
    contact: true, newsletter: true, blog: capabilities.find((c) => c.key === "blog")!.refHas, payments: feats.has("Pricing") || feats.has("Cart / checkout") ? "razorpay" : "none",
    uploads: preset.some((e) => e.fields.some((x) => x.type === "image")), email: false, darkMode: true, seo: true, pwa: true,
    whatsapp: capabilities.find((c) => c.key === "whatsapp")!.suggest, analytics: "none", marketData: trading,
  };

  const btn = d?.design.buttons.find((b) => !/rgba\(.*, 0\)/.test(b.bg) && !/255, 255, 255|0, 0, 0\)/.test(b.bg));
  const hex = (c?: string) => { const m = c?.match(/(\d+),\s*(\d+),\s*(\d+)/); return m ? "#" + [m[1], m[2], m[3]].map((x) => (+x).toString(16).padStart(2, "0")).join("") : "#7c3aed"; };
  const SAFE = ["Inter", "Poppins", "Roboto", "Montserrat", "Lato", "Open Sans", "DM Sans", "Manrope", "Plus Jakarta Sans", "Nunito", "Work Sans", "Outfit", "Rubik", "Space Grotesk"];
  const font = SAFE.find((s) => (d?.design.headingFont ?? "").toLowerCase().includes(s.toLowerCase())) ?? "Inter";

  const spec: Spec = {
    name: brand ? `My ${brand}` : "My Platform", tagline: about.valueProp ?? "", description: q.description ?? "", audience: about.audience.join(", "), category,
    entities: preset, features, tech: { db: "sqlite", hosting: "render" },
    design: { primary: hex(btn?.bg), font, dark: d ? /^#(0|1|2)/.test(hex(d.blocks[1]?.bg)) : false, radius: btn?.radius && btn.radius !== "0px" ? btn.radius : "10px" },
    plans: features.payments !== "none" ? [{ name: "Free", price: 0, period: "month", perks: ["Core features"] }, { name: "Pro", price: 499, period: "month", perks: ["Everything in Free", "Priority support", "Advanced tools"] }] : [],
    referenceUrl: q.finalUrl, referenceTitle: q.title ?? undefined,
  };

  const refFw = about.stackLayers.find((l) => l.layer === "Framework")?.items.join(", ") || "Unknown";
  const techChoices: TechChoice[] = [
    { key: "framework", label: "Framework", reference: refFw, options: [{ value: "next", label: "Next.js 16 (App Router) + TypeScript", pros: "Pages + API + server actions in one app, SEO-friendly, huge ecosystem", cons: "Needs a Node server for dynamic features", recommended: true }] },
    { key: "db", label: "Database", reference: "Not visible from outside", options: [
      { value: "sqlite", label: "SQLite via Prisma", pros: "Zero setup, a file on disk; perfect to start and for one server", cons: "One server only; move to Postgres to scale", recommended: true },
      { value: "postgres", label: "PostgreSQL via Prisma (Neon / Supabase / Render)", pros: "Production-grade, scales, free tiers available", cons: "Needs a DATABASE_URL from a provider" },
    ] },
    { key: "auth", label: "Authentication", reference: capabilities[0].refHas ? "Has login" : "No login", options: [{ value: "builtin", label: "Built-in email + password (bcrypt, signed JWT cookie)", pros: "No vendor, free, you own users table", cons: "Add OAuth later if needed", recommended: true }] },
    { key: "hosting", label: "Hosting", reference: about.hosting ?? "Unknown", options: [
      { value: "render", label: "Render (Docker)", pros: "Persistent disk for SQLite + uploads, free tier", cons: "Free tier sleeps", recommended: true },
      { value: "vercel", label: "Vercel", pros: "Best Next.js DX, global edge", cons: "No persistent disk: use Postgres and an image host" },
      { value: "docker", label: "Any VPS with Docker", pros: "Full control, cheap", cons: "You manage the server" },
    ] },
  ];

  const questions: Question[] = [
    { id: "name", step: "basics", ask: "What's your product called, and what does it do in one line?" },
    { id: "audience", step: "basics", ask: "Who is it for?", hint: about.audience.join(", ") },
    { id: "entities", step: "data", ask: `What will users ${preset[0].visibility === "public" ? "browse and post" : "create and manage"}? I've started with ${preset.map((e) => e.plural).join(" and ")} based on the reference. Add, rename or change fields.` },
    { id: "visibility", step: "data", ask: "Should each type be public (anyone can browse) or private (only its owner sees it)?" },
    { id: "features", step: "features", ask: "Here's what the reference has and doesn't. Which features should your platform have?" },
    { id: "payments", step: "features", ask: "How will you take payments?" },
    { id: "tech", step: "tech", ask: "Pick the database and hosting. I've marked my recommendation." },
    { id: "design", step: "design", ask: "Keep the reference colours and font, or use your own?" },
    { id: "plans", step: "design", ask: "What plans and prices do you want?" },
  ];

  return { spec, capabilities, techChoices, questions, referenceStack: about.stackLayers };
}

// Final comparison: reference vs your platform.
export function compare(caps: Capability[], spec: Spec) {
  const on = (k: Capability["key"]) => k === "core" ? true : k === "payments" ? spec.features.payments !== "none" : k === "analytics" ? spec.features.analytics !== "none" : !!spec.features[k as keyof Features];
  return caps.map((c) => ({ label: c.label, reference: c.refHas, yours: on(c.key), status: c.refHas && on(c.key) ? "Both" : c.refHas ? "Only reference" : on(c.key) ? "Extra in yours" : "Neither" }));
}
