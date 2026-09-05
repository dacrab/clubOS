# ClubOS

Point-of-sale and club management system for sports facilities, entertainment venues, and multi-location businesses.

## Features

- **Point of Sale** - Fast checkout with products, categories, treats, and coupons
- **Bookings** - Manage birthday parties and field reservations
- **Multi-tenant** - Support multiple locations with role-based access
- **Subscriptions** - Polar.sh-powered billing with trial periods
- **Multilingual** - English and Greek support

## Quick Start

```bash
# Install dependencies
bun install

# Set up environment (secrets via Doppler — or copy .env.example to .env)
doppler setup

# Set up the database (Neon)
# Requires DATABASE_URL (via Doppler or .env)
bun run db:migrate

# Seed a demo tenant (requires SEED_PASSWORD, optional CLERK_SECRET_KEY)
bun run db:seed

# Start development server
bun run dev
```

Visit `http://localhost:5173` to see the app.

## Development

```bash
bun run dev          # Start dev server
bun run build        # Build for production
bun run check        # Type check (svelte-check) + knip + biome
bun run test         # Run tests
```

## How it works

- Multi-tenant with role-based access (owner, admin, manager, staff). All data
  queries are scoped to the caller's facility, or every facility in their
  tenant for tenant-wide members.
- Booking overlaps are blocked at the database level; the API returns a
  friendly error instead of a raw constraint violation.
- Subscription access is granted only for an `active`/`trialing` status with a
  future end date, driven by Polar webhooks. Unknown statuses fail closed.
- API endpoints are rate-limited per client IP (Upstash Redis when configured,
  otherwise a per-instance fallback).

## Tech Stack

- **SvelteKit 2** - Full-stack framework
- **Neon** - Serverless Postgres database
- **Drizzle ORM** - Type-safe database access
- **Clerk** - Authentication and user management
- **Tailwind CSS v4** - Styling
- **Polar.sh** - Payment processing
- **Upstash Redis** (optional) - Cross-instance rate limiting

## Deployment

Deploy to Vercel. Required env vars: `DATABASE_URL`, Clerk secret/publishable
keys, `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `BOOKING_TOKEN_SECRET`,
`ORIGIN`; optional: `RESEND_API_KEY` (booking emails), `SENTRY_*`,
`EMAIL_FROM`, `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`.

## License

MIT
