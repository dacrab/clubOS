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

## Architecture notes

### Auth & route protection (`src/hooks.server.ts`)

- All routes require an authenticated Clerk session except:
  - `/` and `/signup` (public)
  - `/api/*` (each endpoint performs its own auth)
  - `/booking/*/manage` — customer-facing page authenticated by an expiring HMAC
    token in the `?token=` query param (emailed links); no account required.
- Authenticated users are redirected by role home: owner/admin → `/admin`,
  manager → `/secretary`, staff → `/staff`. `/admin*` requires owner/admin,
  `/secretary` requires manager+.

### Role permissions for data mutations (`src/routes/api/db/+server.ts`)

| Action group                                   | Allowed roles              |
| ---------------------------------------------- | -------------------------- |
| products/categories insert/update/delete       | owner, admin               |
| bookings insert/update/delete/checkConflict    | owner, admin, manager      |
| registerSessions insert/close, orders, search  | owner, admin, manager, staff |

All queries are scoped to the caller's facility, or (for tenant-wide members
with no facility assignment) every facility in their tenant.

### Booking overlap prevention

Hard-guaranteed in Postgres by the `bookings_no_overlap` EXCLUDE constraint
(`drizzle/0004_booking_no_overlap.sql`, `btree_gist` on facility + type +
`tstzrange(starts_at, ends_at)`, ignoring canceled rows). The API also
re-checks inside the insert transaction and returns HTTP 409 so clients get a
friendly error instead of a constraint violation.

### Billing semantics

- Subscription statuses come from Polar webhooks; unknown/unrecognized statuses
  fail **closed** (treated as `canceled`) so access is never granted by accident.
- Access requires status `active`/`trialing` **and** a future end date
  (`current_period_end` or `trial_end`). After checkout success the subscription
  row is created immediately using the checkout payload's period end when
  present; the Polar webhook remains the source of truth thereafter.
- Checkout creation requires an owner or admin session.

### Rate limiting (`src/lib/server/rate-limiter.ts`)

Fixed-window limits per client IP: burst 30/10s for writes, 200/min for reads.
The store is Upstash Redis (REST pipeline, INCR + EXPIRE NX + PTTL) when
`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set — this makes
the limit hold across serverless instances. Without those variables it falls
back to a per-instance memory Map, which only softens abuse on one warm
instance. Any Upstash failure fails open to memory (warned once per process).
The client IP is taken from the **last** entry of `x-forwarded-for` (the value
appended by our own proxy); earlier entries are attacker-controlled.

### Content Security Policy

Configured in `svelte.config.js` (`kit.csp`, mode `nonce`): SvelteKit injects a
per-request nonce into script-src/style-src plus `'strict-dynamic'`. Third-party
JS (Clerk widget, Sentry loader) loads dynamically from our own nonce'd bundle,
so no `'unsafe-inline'`/`'unsafe-eval'` is needed for scripts. Inline styles
remain allowed (`style-src 'unsafe-inline'`) for component styling.

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
