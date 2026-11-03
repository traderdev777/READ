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
