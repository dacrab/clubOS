# ClubOS

Modern point-of-sale and club management system for sports facilities, entertainment venues, and multi-location businesses.

## Features

- **Point of Sale** - Fast checkout with products, categories, treats, and coupons
- **Bookings** - Manage birthday parties and field reservations
- **Multi-tenant** - Support multiple locations with role-based access
- **Subscriptions** - Stripe-powered billing with trial periods
- **Multilingual** - English and Greek support

## Quick Start

```bash
# Install dependencies
bun install

# Set up environment
cp .env.example .env.local
# Add your Supabase credentials to .env.local

# Start development server
bun run dev
```

Visit `http://localhost:5173` to see the app.

## Development

```bash
bun run dev          # Start dev server
bun run build        # Build for production
bun run check        # Type check and lint
bun run test         # Run tests
```

## Tech Stack

- **SvelteKit 2** - Full-stack framework
- **Supabase** - Database and authentication
- **Tailwind CSS v4** - Styling
- **Stripe** - Payment processing

## Deployment

Deploy to Vercel with one click. Add your environment variables in the Vercel dashboard.

## License

MIT
