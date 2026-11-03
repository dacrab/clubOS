# ClubOS

A point-of-sale and club management app for venues and sports facilities.

**Live demo:** https://clubos.vercel.app

ClubOS brings the counter, bookings, and team tools into one place. Staff can take orders quickly, managers can handle party and field reservations, and owners can run multiple locations from a single account.

## Features

- Fast point of sale with products, categories, treats, and coupons
- Birthday party and field bookings, plus self-service links for customers
- Registers and shift management
- Staff accounts with role-based access
- Multiple locations under one account
- Revenue dashboard and recent orders
- Available in English and Greek

## Run it locally

You'll need [Bun](https://bun.sh), a [Neon](https://neon.tech) Postgres database, a [Clerk](https://clerk.com) app, and [Doppler](https://doppler.com) for secrets.

```bash
bun install
doppler setup
bun run db:migrate
bun run db:seed
bun run dev
```

Open [localhost:5173](http://localhost:5173).

Set `SEED_PASSWORD` before seeding if you want to create the demo tenant and its users.

## Good to know

- Booking overlaps are blocked by the database, so two people can't reserve the same slot.
- Subscriptions run through Polar; access requires an active or trialing subscription.
- Booking emails are optional and need a Resend key.
- Upstash Redis is optional and only adds cross-instance rate limiting.

## Built with

SvelteKit, Neon Postgres, Drizzle, Clerk, Polar, and Tailwind CSS. Hosted on Vercel.

## License

MIT
