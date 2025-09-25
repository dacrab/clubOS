## ClubOS (SvelteKit)

Modern POS and club management UI built with SvelteKit 5 runes, Supabase, Tailwind, and a11y-first UI primitives.

### Features
- **Auth & Users**: Supabase Auth with `users` profile table and roles: `admin`, `staff`, `secretary`.
- **Products & Categories**: CRUD, images in Supabase Storage, low‑stock indicators.
- **Registers & Orders**: Register sessions, orders, order items, discounts/treats, daily summaries.
- **Secretary tools**: Birthdays, football field bookings.
- **Admin area**: Manage users, products, categories, registers, and orders.
- **Internationalization**: `src/lib/i18n.ts` with `t()` utilities.
- **Beautiful UI**: Shadcn-inspired Svelte components exported via barrels under `src/lib/components/ui/*`.
- **Strict typing & linting**: TypeScript strictest options, Biome, Knip, and svelte-check.

### Tech Stack
- SvelteKit 2, Svelte 5 runes (`$state`, `$derived`, `$bindable`)
- Supabase (Auth, Database, Storage)
- Tailwind CSS v4 + Tailwind Variants
- Biome (Ultracite rules), Knip, Vitest

### Monorepo Structure (app)
- `src/lib/supabaseClient.ts` – client SDK
- `src/lib/server/supabaseAdmin.ts` – server admin SDK (service role; server-only)
- `src/lib/user.ts` – session store and profile loader
- `src/routes` – SvelteKit routes (pages + API)
  - `admin/*` – admin dashboards (products, orders, registers, users)
  - `dashboard/*`, `staff/*`, `secretary/*` – role-specific pages
  - `api/admin/users/+server.ts` – admin user management endpoints
- `supabase/*` – local Supabase config and migrations

### Local Development
Prereqs: Bun (or Node), Supabase CLI, Git.

1) Clone and install
```bash
git clone https://github.com/dacrab/clubOS.git
cd clubOS
bun install
```

2) Environment
Create `.env.local` with (client values are public):
```bash
PUBLIC_SUPABASE_URL=...           # Project URL
PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_URL=...                  # server only
SUPABASE_SERVICE_ROLE_KEY=...     # server only
```

3) Supabase (optional local stack)
```bash
supabase start
supabase db reset   # loads schema and seeds as configured
bun run db:seed
```

4) Run the app
```bash
bun run dev
```

5) Quality
```bash
bun run check     # types + svelte-check + biome + knip
bun run test      # vitest
```

### Database Schema (high level)
- `users` (id, username, role) – synced from `auth.users` via trigger
- `categories`, `products` (image_url in storage), indexes for perf
- `register_sessions`, `orders`, `order_items`, `register_closings`
- `appointments`, `football_bookings`
- RLS policies for authenticated users; admin-only writes where needed

### Important Files
- `src/routes/admin/products/+page.svelte` – list, create, edit products, image upload to Supabase Storage
- `src/routes/admin/orders/+page.svelte` – date-range filters, items per order, money formatting
- `src/routes/admin/registers/+page.svelte` – sessions insights and stats
- `src/routes/api/admin/users/+server.ts` – protected admin endpoints

### UI Conventions
- Import UI via barrels, e.g.:
```ts
import { Card, CardContent, CardHeader, CardTitle } from "$lib/components/ui/card";
import { Button } from "$lib/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "$lib/components/ui/table";
```

### Environment Rules
- Client: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY` via `$env/static/public` or `$env/dynamic/public`.
- Server: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` via `$env/dynamic/private`.
- Never expose the service role key in client code.

### GitHub Actions
- `Supabase Keepalive` – pings `PUBLIC_SUPABASE_URL` every 6 days to prevent cold power-off.
- `GitGuardian Secrets Scan` – scans commits for secrets (configured as non-blocking with `--exit-zero`).
- `CodeQL` – code scanning workflow; set repo Settings → Security → enable Code Scanning default setup for full effect.
- `Dependabot` – weekly updates for npm and GitHub Actions.

Required repository secrets:
- `PUBLIC_SUPABASE_URL` (keepalive)
- `GITGUARDIAN_API_KEY` (secrets scan)

### Accessibility & Quality
- Ultracite a11y rules enforced (buttons with `type`, SVG with `title`, no invalid ARIA, etc.)
- TypeScript strictest options (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, ...)

### Common Tasks
```bash
bun run check          # typecheck + lint + knip
npx ultracite fix      # auto-fix formatting & lint issues
bun knip               # find unused code

# Supabase helpers
bun run db:seed
supabase db reset
```

### Deployment
- Adapter: `@sveltejs/adapter-vercel` (configurable). Provide `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` as env vars. For server actions/endpoints, set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as private env vars.

### Notes
- Test credentials in examples are placeholders used for demos and are flagged by scanners; they are intentionally non-sensitive.

# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project in the current directory
npx sv create

# create a new project in my-app
npx sv create my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
