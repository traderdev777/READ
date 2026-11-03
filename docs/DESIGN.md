# RED design system

RED analyses a website with real evidence and turns findings into build actions. The interface should read like a precise instrument built by a small studio: dark, quiet, exact, with one red that always means something.

The living reference is `/system` in `apps/web` (development only; set `RED_SYSTEM_PAGE=1` at build time to include it in a preview build). Every component on that page is the production component.

## 1. Tokens

One source of truth: `apps/web/src/styles/tokens.css`. Tailwind reads the same variables through `@theme inline` in `apps/web/src/app/globals.css`, so `bg-ink-900`, `text-chrome-300`, `rounded-md`, `shadow-glow` and `var(--ink-900)` are always the same value. The `/system` swatches read live values from the stylesheet, so the gallery cannot drift.

### Color

| Token          | Value     | Use                                     |
| -------------- | --------- | --------------------------------------- |
| `--ink-950`    | `#05060A` | Page background                         |
| `--ink-900`    | `#0B0D13` | Surface (cards, inputs, code)           |
| `--ink-800`    | `#141821` | Raised (hover, tooltips, toasts)        |
| `--line`       | `#232936` | Borders and dividers                    |
| `--red-500`    | `#FF1F1F` | Signal: primary action, focus, risk     |
| `--red-600`    | `#D10F0F` | Pressed primary                         |
| `--red-900`    | `#5A0707` | Low-emphasis red on ink (danger, marks) |
| `--chrome-100` | `#F2F5FA` | Primary text                            |
| `--chrome-300` | `#C9D0DC` | Secondary text                          |
| `--chrome-500` | `#8A93A6` | Tertiary text, idle icons               |
| `--detected`   | `#3DDC97` | Status: observed directly               |
| `--inferred`   | `#FFB020` | Status: deduced from signals            |
| `--risk`       | `#FF1F1F` | Status: problem with a fix (same red)   |

Rules:

- One red only. No purple, no blue-purple gradients, no rainbow.
- Red is for action and signal, never decoration. It stays under 8% of any screen.
- One primary (red) button per view. Everything else is ghost.
- Status colours appear only on evidence: badges, meters, highlighted lines.
- Text on ink uses chrome-100/300/500 at full opacity. Do not fade text with opacity; it fails contrast.

### Typography

| Role    | Family         | Use                                                         |
| ------- | -------------- | ----------------------------------------------------------- |
| Display | Michroma       | Wordmark, hero, section titles. Sparingly, never for body.  |
| Body    | Inter Tight    | Everything people read.                                     |
| Mono    | JetBrains Mono | Code, URLs, hosts, headers, selectors, evidence, timestamps |

Scale: 1.25 ratio from 16px, fluid with `clamp()` between 360px and 1440px viewports.

| Token         | Size at 1440px |
| ------------- | -------------- |
| `--text-xs`   | 10.24          |
| `--text-sm`   | 12.8           |
| `--text-base` | 16             |
| `--text-lg`   | 20             |
| `--text-xl`   | 25             |
| `--text-2xl`  | 31.25          |
| `--text-3xl`  | 39             |
| `--text-4xl`  | 48.8           |
| `--text-5xl`  | 61             |

Display tracking is `-0.02em` (`--tracking-display`). Fonts load through `next/font` and expose `--font-michroma`, `--font-inter-tight`, `--font-jetbrains`, mapped to Tailwind `font-display`, `font-sans`, `font-mono`.

### Space, radius, shadow

- 4px grid: `--space-1` (4) to `--space-24` (96). Tailwind spacing is also 4px based; stay on it.
- Radii: `--radius-sm` 4 (chips, code, tooltips), `--radius-md` 8 (controls), `--radius-lg` 14 (surfaces). Tailwind's other radius steps are removed.
- Shadows are glows, not blur-drops. `--glow-red` (1px red ring + 4px red at 12% + 24px red at 12%) for focus and active; `--glow-red-soft` for hover and focused fields; `--glow-chrome` for raised surfaces.

## 2. Motion

`apps/web/src/motion`. Tokens in `motion/tokens.ts` mirror the CSS variables.

- Easings: out-expo `cubic-bezier(0.16, 1, 0.3, 1)` for entering and state changes; in-out-quart `cubic-bezier(0.76, 0, 0.24, 1)` for exits and swaps.
- Durations: 120ms (hover, press), 240ms (toggle, tab, tooltip), 480ms (enter, exit, toast), 900ms (scan sweep, dissolve).
- Every animation communicates state: something entered, something is working, something was replaced, something follows the pointer. No decorative bounce, no idle loops, no fade-in for its own sake.

Primitives:

| Primitive          | State it communicates                              | Reduced motion                       |
| ------------------ | -------------------------------------------------- | ------------------------------------ |
| `<Reveal>`         | Content entered the viewport (staggered)           | Renders in place, no transform       |
| `<PixelDissolve>`  | Content is being replaced (the logo's pixel motif) | Instant swap                         |
| `<ScanLine>`       | Analysis is running (GSAP sweep while `active`)    | Static red top border                |
| `<MagneticButton>` | This is the next step                              | Off (also off on touch and disabled) |
| `<Cursor>`         | What the target does: action, text, copy, disabled | Off (native cursor always visible)   |

Reduced motion is honoured three ways: the OS `prefers-reduced-motion` media query zeroes CSS durations; `usePrefersReducedMotion()` drives JS primitives; `MotionConfig` switches Framer Motion to reduced mode. The `/system` rail has a switch that forces the same state for review.

## 3. Components

`apps/web/src/components/ui`. Each ships default, hover, focus, disabled and loading/skeleton states; `/system` shows all of them, with forced rows for hover and focus.

| Component         | Notes                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------- |
| `Button`          | `primary` / `ghost` / `danger`, `sm` / `md` / `lg`, `loading` + `loadingLabel`, icons; `ButtonSkeleton` |
| `Input`           | Visible label, hint, error with fix-it copy, `loading`, `mono` for URLs; `InputSkeleton`                |
| `Badge`           | `detected` / `inferred` / `risk`, optional subject text; `BadgeSkeleton`                                |
| `Card`            | `interactive`, `selected` (red edge), `disabled`, eyebrow/title/footer; `CardSkeleton`                  |
| `Tabs`            | WAI-ARIA tabs, arrow/Home/End, disabled tabs skipped, animated red bar, `loading`                       |
| `CodeBlock`       | Mono, line numbers, highlighted evidence lines, copy with copied/blocked feedback, `loading`            |
| `Tooltip`         | Hover (250ms) and focus (instant), Escape closes, `aria-describedby`                                    |
| `ConfidenceMeter` | 0–100 `role="meter"`, ticks at 40 and 80, colour from level, `disabled`, `loading`                      |
| `Toast`           | `ToastProvider` + `useToast()`, info/success/risk, action, pause on hover/focus, max 4                  |
| `Logo`            | SVG mark + wordmark, `variant` full/mark/wordmark, `src` swaps in the final vector                      |

Icons: Lucide only, `strokeWidth={1.5}`, `aria-hidden` when decorative.

### Logo

`Logo.tsx` is drawn from the brand artwork: signal-red R with a chrome lower stem, trailing pixel squares, `</>` in the bowl, orbit swoosh; chrome RED wordmark with a red bar in the E. When the final vector file arrives, either pass `src="/brand/red-logo.svg"` or replace the `Mark` and `Wordmark` paths. Source artwork lives at `apps/web/public/brand/red-logo.webp` (1600 × 533, raster on black) for social cards and decks; the favicon is `apps/web/src/app/icon.svg`, drawn from the mark. Minimum height 16px. Clear space on every side equals the height of the E's red bar.

## 4. Anti-AI-look checklist

Enforced in review. A change that breaks one of these does not ship.

- [ ] No emoji used as icons. Lucide only, 1.5px stroke.
- [ ] No stock gradients, glassmorphism, floating blobs or noise overlays.
- [ ] One red. No purple, no blue-purple, no rainbow. Red under 8% of the screen.
- [ ] No "Welcome to…", "Unlock", "Supercharge", "Seamless", "Revolutionize".
- [ ] No lorem ipsum or placeholder copy. Sample data is realistic and specific.
- [ ] Microcopy is precise, confident, engineer-to-engineer: numbers, file names, headers.
- [ ] Errors say what to do next ("Enter a full URL, including https://").
- [ ] Everything aligns to the 4px grid. Radii are 4, 8 or 14 only.
- [ ] Code, URLs, headers and evidence are always mono.
- [ ] Layouts are asymmetric and editorial. No generic centred card grids.
- [ ] Every animation maps to a state change and has a reduced-motion path.

## 5. Accessibility

- Target: Lighthouse accessibility ≥ 95 on every page (`/system` scores 100 in a production build).
- Focus is always visible: the red glow ring on `:focus-visible`.
- Text contrast meets WCAG AA on ink; never lower contrast with opacity.
- Interactive elements have accessible names; decorative icons are `aria-hidden`.
- Toasts use `role="status"` (risk uses `role="alert"`); copy feedback is announced via `aria-live`.
