# Landing page (/) — decisions

Built only from the design system: tokens.css, the motion primitives and the core components. No new colours, fonts or easings.

## Structure

Nav → Hero (URL input) → How it works (pinned, 5 passes) → Evidence → Actions → Trust and limits → Pricing → Waitlist → Footer. `/scan` is the honest placeholder until the scanner is wired.

## Decisions

- **Red budget.** The pixel R is chrome; only the six trailing signal pixels, the primary buttons and the scan line are red, keeping red well under 8% of any viewport. The Pro tier gets a 1px red top edge, nothing more.
- **Hero mark.** Assembly is one CSS keyframe with per-pixel delays (order from `pixelOrder`, shared with PixelDissolve), not 150 animated React nodes. Cursor drift moves five depth layers via rAF. GSAP for the single ScanLine sweep loads after hydration.
- **How it works.** ≥768px: GSAP ScrollTrigger pins the section and scrubs the red progress line; GSAP loads on demand. <768px or reduced motion: a plain vertical list with every step and snippet visible.
- **URL validation** (`src/lib/scan-url.ts`), client and server: https only (bare domains get https://), no credentials, default port only, rejects localhost, *.local/.internal/.lan/.test etc., private/reserved IPv4 and IPv6, and raw public IPs (domain names only). DNS-rebinding protection belongs in the scanner, which must re-check resolved IPs.
- **Waitlist.** Server action + zod, honeypot field, in-memory fixed-window rate limit (5 per 10 min per IP, single instance; swap for Redis when scaled). Inserts through Supabase's REST endpoint with the anon key and `Prefer: return=minimal`, so anon needs INSERT only and can never read the list. Duplicate = unique index on lower(email) → 409/23505 → "You're already on the list". Migration: `supabase/migrations/0001_waitlist.sql`.
- **Illustrations.** Every product mock-up (pass snippets, finding card, action code) carries an "Illustration" mono label.
- **Pricing.** No numbers: "Pricing announced at launch"; every CTA goes to #waitlist.
- **SEO.** Metadata + canonical, OpenGraph image generated with next/og from `lib/brand.ts` (a hex mirror of tokens.css for contexts without CSS variables), sitemap.xml, robots.txt (disallows /scan and /system), SoftwareApplication JSON-LD.
- **Performance.** Cursor and ScanLine load via next/dynamic; below-fold sections use `content-visibility: auto`; fonts via next/font (size-adjusted fallbacks, no CLS).
