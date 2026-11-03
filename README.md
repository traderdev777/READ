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
