# RED

RED takes any website URL, analyses it with real evidence, and turns the findings into build actions.

This branch sets up the monorepo and the design system. No product pages yet.

```
apps/web         Next.js App Router, Tailwind CSS 4, Framer Motion, GSAP. /system design gallery (dev only)
apps/scanner     Node + TypeScript service. GET /health only for now
packages/shared  Shared types: Scan, Finding, Evidence, Confidence
docs/DESIGN.md   The design system: tokens, motion, components, rules
legacy/read-v1   The previous READ app (scanner, analysis, Build Studio), kept intact
```

## Run

```bash
pnpm install
pnpm dev            # web at http://localhost:3000 (redirects to /system)
pnpm dev:scanner    # scanner at http://localhost:4000/health
```

Other scripts: `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm format`.

Copy `.env.example` to `.env` and fill in `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SCANNER_URL` when the services that use them land.

`/system` is development only. A production build includes it only when built with `RED_SYSTEM_PAGE=1` (preview deploys).

## Legacy

The READ v1 app (Playwright scanner, analysis report, actions, Build Studio) is preserved in `legacy/read-v1/` and on the `legacy/read-v1` branch. It is outside the pnpm workspace and is ported into `apps/scanner` milestone by milestone.
