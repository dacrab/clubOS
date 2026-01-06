# ClubOS

Modern POS and club management system built with SvelteKit 5, Supabase, and Tailwind CSS v4.

## Features

- **Multi-tenant**: Organizations with facilities, role-based access (owner/admin/manager/staff)
- **POS**: Products, categories, register sessions, orders with treats/coupons
- **Bookings**: Birthday parties and football field reservations
- **Billing**: Stripe integration with subscription management
- **i18n**: English and Greek translations

## Tech Stack

- SvelteKit 2 + Svelte 5 runes (`$state`, `$derived`)
- Supabase (Auth, Database)
- Tailwind CSS v4 + shadcn-svelte components
- TypeScript (strict mode)
- Vitest + Playwright

## Quick Start

```bash
# Install
bun install

# Environment
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Development
bun run dev

# With local Supabase
supabase start
supabase db reset
bun run db:seed
```

## Scripts

```bash
bun run dev          # Start dev server
bun run build        # Production build
bun run check        # Type check + lint + knip
bun run test         # Unit tests (vitest)
bun run test:e2e     # E2E tests (playwright)
bun run db:seed      # Seed demo data
bun run db:reset     # Reset and seed database
```

## Project Structure

```
src/
├── routes/           # SvelteKit pages and API routes
│   ├── (app)/        # Authenticated app routes
│   │   ├── admin/    # Admin pages (products, users, settings)
│   │   ├── staff/    # Staff POS interface
│   │   └── bookings/ # Booking management
│   └── api/          # API endpoints
├── lib/
│   ├── components/   # UI components (shadcn-svelte)
│   ├── services/     # Database service layer
│   ├── state/        # Svelte 5 state modules
│   ├── i18n/         # Translations (en, el)
│   └── types/        # TypeScript types
└── hooks.server.ts   # Auth middleware
```

## Environment Variables

```bash
# Required
PUBLIC_SUPABASE_URL=https://xxx.supabase.co
PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=eyJ...

# Server-side (for admin operations)
SUPABASE_SECRET_KEY=eyJ...
```

## Database

Core tables: `tenants`, `facilities`, `users`, `memberships`, `products`, `categories`, `orders`, `order_items`, `bookings`, `register_sessions`, `subscriptions`

See `supabase/migrations/` for schema.

## Testing

```bash
bun run test              # Unit tests
bun run test:e2e          # E2E tests (requires dev server)
SKIP_DB_TESTS=false bun run test  # Include database integration tests
```

## Deployment

Configured for Vercel with `@sveltejs/adapter-vercel`. Set environment variables in Vercel dashboard.
