// Lightweight, AI-free tech-stack fingerprints (Wappalyzer-style).
export type Signal = { name: string; category: string; evidence: string };

type Rule = {
  name: string;
  category: string;
  html?: RegExp;
  header?: [string, RegExp];
  cookie?: RegExp;
};

const RULES: Rule[] = [
  { name: "Next.js", category: "Framework", html: /__NEXT_DATA__|\/_next\/static/ },
  { name: "Nuxt", category: "Framework", html: /__NUXT__|\/_nuxt\// },
  { name: "Gatsby", category: "Framework", html: /___gatsby/ },
  { name: "Astro", category: "Framework", html: /astro-island|data-astro-cid/ },
  { name: "SvelteKit", category: "Framework", html: /__sveltekit|data-sveltekit/ },
  { name: "Remix", category: "Framework", html: /__remixContext/ },
  { name: "Angular", category: "Framework", html: /ng-version=|ng-app/ },
  { name: "React", category: "UI library", html: /data-reactroot|react-dom|__reactFiber/ },
  { name: "Vue", category: "UI library", html: /data-v-[0-9a-f]{6,}|vue(\.min)?\.js/ },
  { name: "Vite", category: "Build tool", html: /\/assets\/index-[A-Za-z0-9_-]{6,}\.js|type="module" crossorigin/ },
  { name: "WordPress", category: "CMS", html: /wp-content\/|wp-includes\// },
  { name: "Shopify", category: "E-commerce", html: /cdn\.shopify\.com|Shopify\.theme/ },
  { name: "Webflow", category: "Site builder", html: /webflow\.(js|com)|data-wf-page/ },
  { name: "Wix", category: "Site builder", html: /static\.wixstatic\.com|wix-bolt/ },
  { name: "Squarespace", category: "Site builder", html: /squarespace\.com|static1\.squarespace/ },
  { name: "Framer", category: "Site builder", html: /framerusercontent\.com|framer\.com\/m\// },
  { name: "Tailwind CSS", category: "CSS", html: /class="[^"]*\b(?:flex|grid)\b[^"]*\b(?:px|py|mt|mb)-\d/ },
  { name: "Bootstrap", category: "CSS", html: /bootstrap(\.min)?\.(css|js)/ },
  { name: "jQuery", category: "JS library", html: /jquery(\.min)?\.js|jquery-\d/ },
  { name: "Google Analytics", category: "Analytics", html: /googletagmanager\.com\/gtag|google-analytics\.com/ },
  { name: "Google Tag Manager", category: "Analytics", html: /googletagmanager\.com\/gtm\.js|GTM-[A-Z0-9]+/ },
  { name: "Meta Pixel", category: "Analytics", html: /connect\.facebook\.net\/.*fbevents/ },
  { name: "Hotjar", category: "Analytics", html: /static\.hotjar\.com/ },
  { name: "Segment", category: "Analytics", html: /cdn\.segment\.com/ },
  { name: "Stripe", category: "Payments", html: /js\.stripe\.com/ },
  { name: "Razorpay", category: "Payments", html: /checkout\.razorpay\.com/ },
  { name: "Intercom", category: "Support", html: /widget\.intercom\.io/ },
  { name: "Google Fonts", category: "Fonts", html: /fonts\.googleapis\.com/ },
  { name: "Cloudflare", category: "CDN", header: ["server", /cloudflare/i] },
  { name: "Vercel", category: "Hosting", header: ["server", /vercel/i] },
  { name: "Netlify", category: "Hosting", header: ["server", /netlify/i] },
  { name: "GitHub Pages", category: "Hosting", header: ["server", /github\.com/i] },
  { name: "nginx", category: "Web server", header: ["server", /nginx/i] },
  { name: "Apache", category: "Web server", header: ["server", /apache/i] },
  { name: "Amazon CloudFront", category: "CDN", header: ["via", /cloudfront/i] },
  { name: "Fastly", category: "CDN", header: ["x-served-by", /cache-/i] },
  { name: "PHP", category: "Language", header: ["x-powered-by", /php/i] },
  { name: "Express", category: "Web server", header: ["x-powered-by", /express/i] },
];

export function detectStack(html: string, headers: Headers): Signal[] {
  const found: Signal[] = [];
  for (const r of RULES) {
    if (r.html && r.html.test(html)) {
      found.push({ name: r.name, category: r.category, evidence: "page markup" });
    } else if (r.header) {
      const v = headers.get(r.header[0]);
      if (v && r.header[1].test(v)) found.push({ name: r.name, category: r.category, evidence: `${r.header[0]}: ${v}` });
    }
  }
  const gen = html.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)/i);
  if (gen && !found.some((f) => gen[1].toLowerCase().includes(f.name.toLowerCase()))) {
    found.push({ name: gen[1], category: "Generator", evidence: "meta generator" });
  }
  return found;
}
