# ClubOS (SvelteKit)

Modern POS and club management UI built with SvelteKit 5 runes, Supabase, Tailwind CSS v4, and a11y‑first UI primitives.

## Features
- **Auth & Users**: Supabase Auth with `users` profile table and roles: `admin`, `staff`, `secretary`.
- **Products & Categories**: CRUD, low‑stock indicators, hierarchical categories.
- **Registers & Orders**: Register sessions, orders, order items, discounts/treats, daily summaries.
- **Secretary tools**: Birthdays/appointments, football field bookings.
- **Admin**: Manage users, products, categories, registers, and orders.
- **Internationalization**: `src/lib/i18n.ts` with `t()`/`tt()` utilities and `en`/`el` locales.
- **Beautiful UI**: Shadcn‑inspired Svelte components exported via barrels under `src/lib/components/ui/*`.
- **Strict typing & linting**: TypeScript strictest options, Biome (Ultracite), Knip, svelte-check, Vitest.

## Tech Stack
- SvelteKit 2, Svelte 5 runes (`$state`, `$derived`, `$bindable`)
- Supabase (Auth, Database, Storage)
- Tailwind CSS v4 + Tailwind Variants + tailwind-merge
- Tooling: Biome (Ultracite rules), Knip, Vitest

## Getting Started
Prerequisites: Bun 1.1+ (or Node 20+), Supabase CLI, Git.

1) Clone and install
```bash
git clone https://github.com/dacrab/clubOS-svelte.git
cd clubOS-svelte
bun install
```

2) Environment
Copy example env and edit:
```bash
cp .env.example .env.local
```

Keys used by the app: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or legacy `PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`). Local-only: `SUPABASE_SECRET_KEY` (for `bun run db:seed`).

3) Optional: local Supabase
```bash
supabase start
supabase db reset      # loads schema from supabase/migrations
bun run db:seed        # seeds demo tenant, users, categories, products, orders
```

4) Run the app
```bash
bun run dev
```

5) Quality & tests
```bash
bun run check          # svelte-check + biome + knip
bun run test           # vitest
```

## Scripts
```bash
bun run dev            # start dev server
bun run build          # production build
bun run preview        # preview production build
bun run check          # typecheck + svelte-check + biome + knip
bun run check:watch    # watch mode (svelte-check + ultracite fix)
bun run test           # run unit tests (vitest)
bun run db:seed        # seed database (requires service role key locally)
bun run db:reset       # supabase db reset + seed
bun run db:restart     # supabase stop && supabase start
```

## Project Structure (high level)
- `src/lib/supabase-client.ts` – Supabase client (browser) via `$env/dynamic/public`.
- `src/lib/user.ts` – current user store and profile/tenant loader.
- `src/lib/i18n.ts` – i18n utilities and translations (`en`, `el`).
- `src/lib/components/ui/**` – reusable UI; import from barrels.
- `src/routes/**` – SvelteKit routes (pages + endpoints): `admin/*`, `staff/*`, `secretary/*`, `reset/*`, `api/*`.
- `scripts/seed.ts` – idempotent database seeding (service role key, local only).
- `supabase/**` – CLI config and migrations.
- Config: `svelte.config.js`, `vite.config.ts`, `biome.jsonc`, `knip.json`, `tsconfig.json`.

## Conventions
- **Runes**: Use `$state` for local mutable state, `$derived` for pure computed values, `$bindable` for two‑way bindable props.
- **UI barrels**: Prefer barrel imports for shared UI:
```ts
import { Card, CardContent, CardHeader, CardTitle } from "$lib/components/ui/card";
import { Button } from "$lib/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "$lib/components/ui/table";
```
- **Aliases**: `$lib/*`, `$app/*`, `$env/*` (see `knip.json`). Avoid namespace imports.
- **Accessibility**: Follow Ultracite a11y rules (SVG `title`, button `type`, valid ARIA only, no positive `tabIndex`).
- **TypeScript**: Strictest settings enabled (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, etc.). Use `import type` for types.

## Environment
- Runtime (client): `PUBLIC_SUPABASE_URL` and one of `PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` are required. The app throws if missing.
- Server/admin: use `SUPABASE_SECRET_KEY`. On hosted projects, prefer an `sb_secret_...` key. For local Supabase CLI, you must use the legacy JWT `service_role` key (the `sb_secret_...` key is not supported by the local Auth server for admin endpoints).
- Local tooling only: `SUPABASE_SECRET_KEY` is used by `scripts/seed.ts` to bypass RLS for seeding. Never expose this key to browsers or deploy hosts.
- SvelteKit CSP: production CSP is strict (`script-src 'self'`, `style-src 'self'`). Add hosts explicitly if you embed external resources.

## Database (high level)
- Core tables: `users`, `categories`, `products`, `register_sessions`, `orders`, `order_items`, `tenant_members`, `facilities`, `appointments`, `football_bookings`, `tenant_settings`, `user_preferences`.
- RLS: default authenticated access; admin‑level writes where appropriate.
- Seeding: creates a demo tenant/facility, admin/staff/secretary users, categories/products, an open register session, sample order, appointments, and football bookings.

## Testing
- Unit tests with Vitest: `bun run test`.
- Example test setup files: `vitest-env-public.ts`, `vitest-setup-client.ts`.

## CI/CD
Workflows in `.github/workflows`:
- `ci.yml` – install, typecheck, lint, tests.
- `codeql.yml` – code scanning.
- `dependabot.yml` – dependency updates (Actions + npm).

Recommended repository secrets:
- `GITGUARDIAN_API_KEY` (if using a secrets scan workflow)

## Deployment
- Adapter: `@sveltejs/adapter-vercel`.
- Set `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` on the host.
- Ensure CSP allows any required external resources.
 - Scheduled keep‑alive: `vercel.json` defines a cron to hit `/api/keep-alive` every 6 days at 03:17 UTC.

## Troubleshooting
- "Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY": set both in `.env.local` (dev) or host env (prod).
- CSP blocks fonts/scripts in production: update `svelte.config.js` CSP directives.
- Local Supabase ports: dev CSP already allows `127.0.0.1:54321` and Vite HMR; ensure CLI is running.

---
This repository enforces strict a11y and code quality via Ultracite + Biome and strict TypeScript. Prefer barrel imports and typed-only imports for a clean, tree‑shakable surface.
