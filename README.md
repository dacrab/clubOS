# ClubOS

The counter, the bookings, and the team — in one place.

**Live demo:** https://clubos.vercel.app

ClubOS is a point-of-sale and management app for clubs, sports venues, and other multi-location businesses. Staff take orders, managers look after parties and field reservations, and owners keep an eye on revenue and access.

## Day to day

- Sell products, categories, treats, and coupons from a fast checkout
- Take birthday party and field bookings, with self-service links for customers
- Open and close register sessions, then look back at past ones
- Give staff the access they need: owner, admin, manager, or staff
- Run more than one location from the same account
- Follow revenue and recent orders on the dashboard
- Switch between English and Greek

## Running locally

Local setup takes a Neon database, a Clerk application, and Doppler.

```bash
bun install
doppler setup
bun run db:migrate
bun run db:seed
bun run dev
```

Visit [localhost:5173](http://localhost:5173). Set `SEED_PASSWORD` before running the seed if you want the demo tenant.

## A few details

- The database blocks overlapping bookings, so two people can't take the same slot.
- Subscriptions go through Polar and need an active or trialing plan.
- Booking emails are optional and use Resend.
- Upstash Redis is optional; it adds rate limiting across instances.

SvelteKit, Neon Postgres, Drizzle, Clerk, Polar, and Tailwind CSS. Deployed on Vercel. MIT licensed.
