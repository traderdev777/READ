# READ — Reverse Engineering Anything and Develop

Paste a link to a website and READ tears it down: tech stack, design system, page structure, features and quality. Then it develops a similar product with your changes.

v1 is websites only. Apps and tools come later.

## Milestones
1. **Skeleton** — Next.js app, `/api/scan`, URL box, quick fetch-based scan (stack fingerprints, meta, colours, fonts, internal links). ✅
2. **Scanner** — headless Chromium (`/api/deep-scan`): desktop and mobile screenshots, computed colours, fonts, sizes, radii and buttons, speed (LCP, CLS, TTFB, load, requests), network map and API calls, feature detection, sitemap. ✅
3. **AI report** — Gemini turns the scan into a readable teardown.
4. **Generator** — pick pages, describe changes, get a Next.js project with live preview and zip.
5. **Launch** — deploy to Render or Railway, GitHub push.
6. **Extras** — competitor compare, saved reports, re-scans, PDF export.

## Modes
- **Inspired-by** (default): same layout ideas, your own branding, text and images.
- **Exact**: only for sites you own or have rights to.

## Run locally
```bash
npm install
npm run dev   # http://localhost:3000
```

Needs a Node server (not GitHub Pages): the scans run in API routes. The deep scan needs Chromium; set `CHROMIUM_PATH` if it isn't at `/usr/bin/chromium`.

## What a READ analysis covers (`POST /api/analyze`)

- **Scores** (0–100): overall, performance, SEO, accessibility, best practices, security, mobile, content. Every issue comes with severity, evidence and a fix.
- **Speed:** TTFB, FCP, LCP (+ the LCP element), CLS, total blocking time, long tasks, DOM ready, load (desktop and phone), phone LCP.
- **Weight:** bytes by type, heaviest and slowest files, JS/CSS code coverage (shipped vs. unused), uncompressed and uncached files.
- **Images:** count, formats, lazy-loading, missing dimensions, oversized images, largest files.
- **Design system:** colour palette by role (hex), fonts and loaded web fonts, type scale, line heights, spacing scale, radii, shadows, buttons, CSS variables, breakpoints, full-page screenshot.
- **SEO:** search snippet preview, title/description lengths, canonical, robots, lang, hreflang, favicon, manifest, Open Graph, Twitter cards, JSON-LD types, heading outline, internal/external/social links.
- **Content:** word count, reading time, page sections top to bottom, CTAs, forms and their fields, navigation.
- **Tech:** fingerprinted stack + in-page runtime detection (frameworks, libraries with versions, analytics, payments…), third parties by category and weight, server response headers, DOM size and depth.
- **Network:** API calls (XHR/fetch), failed requests, protocols, cookies, localStorage, service worker.
- **Accessibility & mobile:** missing alt, unlabelled fields, unnamed buttons, empty links, heading skips, landmarks, low-contrast text, small tap targets, sideways scroll.
- **Security:** HTTPS, 7 security headers explained, version leaks, cookie flags, redirect chain, JavaScript errors.
- **Sitemap:** robots.txt, sitemap URLs, grouped page templates.
- **Export:** Markdown report, raw JSON, full screenshot. Optional Gemini write-up when `GEMINI_API_KEY` is set.

## What it does, code, and actions

- **What it does:** category, audience, main promise, offerings, user flows (sign-up, purchase, discovery, leads), how it makes money, page templates.
- **Tech:** plain-English stack summary plus a layer table (framework, languages, build tool, rendering, UI libraries, CMS, fonts, hosting, CDN, npm packages, third-party services).
- **Code:** languages, bundler (Turbopack / Webpack / Vite…), rendering mode, every script and stylesheet with size and loading mode, original source file tree and npm packages when the site publishes source maps, code samples for study.
- **Sections:** the page split into blocks (header, hero, listings, pricing, FAQ, footer…), each with a screenshot, issues, cleaned HTML and computed CSS, and actions:
  - *Rebuild as code*: an original React component + CSS module with a live preview and zip.
  - *Improve / fix*: section-specific fixes with code.
  - *Custom instruction*: any change you describe (needs `GEMINI_API_KEY`).
- **Build / Act (whole site):** *Fix everything* (security headers for Next.js / nginx / Vercel / Netlify, metadata + JSON-LD, sitemap/robots, image optimisation script, deferred tags, checklist), *Build my version* (Next.js project with preview + zip), or a custom instruction.

READ never copies third-party code or images into what it generates. Original text is reused only in exact mode, for sites you own.

Env: `GEMINI_API_KEY` (optional AI), `CHROMIUM_PATH` (Chromium / headless-shell binary).

## Build Studio (full-stack generator)

Open **🛠 Build Studio** after a scan. READ interviews you step by step and compares the reference with your build at every step:

1. **Basics**: name, tagline, what it does, audience, product type (prefilled from the scan).
2. **Data**: the things users browse or manage (e.g. Listings, Stocks, Trades), their fields, filters and public/private visibility.
3. **Features**: each capability with *reference has it?*, evidence, my suggestion and why, and your choice (auth, dashboard, admin, search, watchlist, reviews, contact, WhatsApp, newsletter, blog, Razorpay/Stripe, uploads, live market data, dark mode, SEO, PWA, analytics).
4. **Technology**: database, auth and hosting options with pros/cons and the reference's stack side by side.
5. **Design & plans**: colours, font, radius, theme, pricing plans.
6. **Review & build**: final *Reference vs yours* table (both / only reference / extra in yours), then a downloadable project.

The generated project is a real, working app (template in `studio-template/`): Next.js 16 + TypeScript, Prisma (SQLite or Postgres), email/password auth with bcrypt + signed JWT cookies, browse with search/filters/sort/pagination, detail pages, favourites, reviews, user dashboard with create/edit/delete, admin (users, roles, content, leads, subscribers, payments), blog with editor, contact leads, newsletter, Razorpay or Stripe checkout with signature verification, image uploads, live quotes API, sitemap/robots/manifest, dark mode, Dockerfile and seed script.
