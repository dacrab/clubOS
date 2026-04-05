/**
 * ClubOS Demo Seed
 *
 * Creates a fully-functional demo environment:
 *   - 1 tenant (Demo Club) with subscription + facility
 *   - 4 users: owner, admin, manager, staff
 *   - 3 product categories (Greek locale)
 *   - 10 products across those categories
 *
 * Usage:
 *   bun run db:seed
 *
 * Required env (loaded from .env.local via the npm script):
 *   PUBLIC_SUPABASE_URL   — local Supabase API URL
 *   SUPABASE_SECRET_KEY   — service_role JWT (for admin auth operations)
 *   SEED_PASSWORD         — password for all demo users
 */

import { createClient } from "@supabase/supabase-js";

// ─── Env validation ────────────────────────────────────────────────────────

const url      = process.env.PUBLIC_SUPABASE_URL;
const key      = process.env.SUPABASE_SECRET_KEY;
const PASSWORD = process.env.SEED_PASSWORD;

if (!url || !key || !PASSWORD) {
	console.error("❌ Missing env: PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, SEED_PASSWORD");
	process.exit(1);
}

const supabase = createClient(url, key, {
	auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Seed data ─────────────────────────────────────────────────────────────

const USERS = [
	{ email: "owner@clubos.app",   name: "Demo Owner",   role: "owner"   },
	{ email: "admin@clubos.app",   name: "Demo Admin",   role: "admin"   },
	{ email: "manager@clubos.app", name: "Demo Manager", role: "manager" },
	{ email: "staff@clubos.app",   name: "Demo Staff",   role: "staff"   },
] as const;

const CATEGORIES = ["Καφέδες", "Σνακ", "Αναψυκτικά"] as const;
type Category = (typeof CATEGORIES)[number];

const PRODUCTS: { name: string; price: number; cat: Category; stock?: number }[] = [
	{ name: "Espresso",          price: 2.0, cat: "Καφέδες" },
	{ name: "Cappuccino",        price: 3.0, cat: "Καφέδες" },
	{ name: "Freddo Espresso",   price: 3.0, cat: "Καφέδες" },
	{ name: "Freddo Cappuccino", price: 3.5, cat: "Καφέδες" },
	{ name: "Κρουασάν",          price: 2.5, cat: "Σνακ",        stock: 20 },
	{ name: "Τοστ",              price: 3.0, cat: "Σνακ",        stock: 15 },
	{ name: "Σάντουιτς",         price: 4.0, cat: "Σνακ",        stock: 10 },
	{ name: "Νερό 500ml",        price: 0.5, cat: "Αναψυκτικά",  stock: 50 },
	{ name: "Coca-Cola",         price: 2.0, cat: "Αναψυκτικά",  stock: 30 },
	{ name: "Πορτοκαλάδα",       price: 2.0, cat: "Αναψυκτικά",  stock: 30 },
];

// ─── Helpers ───────────────────────────────────────────────────────────────

function step(msg: string): void {
	console.log(`  ✓ ${msg}`);
}

function warn(msg: string): void {
	console.warn(`  ⚠ ${msg}`);
}

// ─── Seed ──────────────────────────────────────────────────────────────────

async function seed(): Promise<void> {
	console.log("\n🌱 Seeding ClubOS...\n");

	// ── Tenant ──────────────────────────────────────────────────────────────
	const { data: tenant } = await supabase
		.from("tenants")
		.upsert(
			{ name: "Demo Club", slug: "demo-club", settings: { currency_code: "EUR" } },
			{ onConflict: "slug" }
		)
		.select("id")
		.single()
		.throwOnError();

	if (!tenant) throw new Error("Failed to upsert tenant");

	// ── Subscription ────────────────────────────────────────────────────────
	const trialEnd = new Date(Date.now() + 14 * 86_400_000).toISOString();
	await supabase
		.from("subscriptions")
		.upsert(
			{
				tenant_id:          tenant.id,
				status:             "trialing",
				plan_name:          "Trial",
				trial_end:          trialEnd,
				current_period_end: trialEnd,
			},
			{ onConflict: "tenant_id" }
		)
		.throwOnError();

	// ── Facility ─────────────────────────────────────────────────────────────
	const { data: facility } = await supabase
		.from("facilities")
		.upsert(
			{ tenant_id: tenant.id, name: "Main Facility" },
			{ onConflict: "tenant_id,name" }
		)
		.select("id")
		.single()
		.throwOnError();

	if (!facility) throw new Error("Failed to upsert facility");

	step("Tenant + Subscription + Facility");

	// ── Users ────────────────────────────────────────────────────────────────
	// Fetch existing auth users once to avoid duplicate creation.
	const { data: authData } = await supabase.auth.admin.listUsers();
	const existingByEmail = new Map(authData.users.map((u) => [u.email, u.id]));

	let ownerId: string | undefined;

	for (const u of USERS) {
		// Resolve or create auth user
		let userId = existingByEmail.get(u.email);

		if (!userId) {
			const { data, error } = await supabase.auth.admin.createUser({
				email:          u.email,
				password:       PASSWORD,
				email_confirm:  true,
				user_metadata:  { full_name: u.name },
			});
			if (error) { warn(`Failed to create ${u.email}: ${error.message}`); continue; }
			userId = data.user?.id;
		}

		if (!userId) continue;
		if (u.role === "owner") ownerId = userId;

		// Sync public.users profile
		await supabase
			.from("users")
			.upsert({ id: userId, full_name: u.name }, { onConflict: "id" })
			.throwOnError();

		// Memberships use partial unique indexes (not usable by PostgREST for
		// ON CONFLICT), so we select-then-insert to stay idempotent.
		// - tenant-wide membership: facility_id IS NULL (owner, admin, manager)
		// - facility-specific:      facility_id set      (staff)
		const facilityId: string | null = u.role === "staff" ? facility.id : null;

		const existingQuery = supabase
			.from("memberships")
			.select("id")
			.eq("user_id", userId)
			.eq("tenant_id", tenant.id);

		const { data: existing } = await (
			facilityId
				? existingQuery.eq("facility_id", facilityId)
				: existingQuery.is("facility_id", null)
		).maybeSingle();

		if (!existing) {
			await supabase
				.from("memberships")
				.insert({
					user_id:     userId,
					tenant_id:   tenant.id,
					facility_id: facilityId,
					role:        u.role,
					is_primary:  u.role === "owner",
				})
				.throwOnError();
		}
	}

	if (!ownerId) throw new Error("Owner user not created — cannot seed products");
	step("Users (4)");

	// ── Categories ───────────────────────────────────────────────────────────
	const { data: catRows } = await supabase
		.from("categories")
		.upsert(
			CATEGORIES.map((name) => ({ facility_id: facility.id, name })),
			{ onConflict: "facility_id,name" }
		)
		.select("id, name")
		.throwOnError();

	const catMap = Object.fromEntries(
		(catRows ?? []).map((c) => [c.name, c.id])
	) as Record<Category, string>;

	step("Categories (3)");

	// ── Products ─────────────────────────────────────────────────────────────
	await supabase
		.from("products")
		.upsert(
			PRODUCTS.map((p) => ({
				facility_id:     facility.id,
				category_id:     catMap[p.cat],
				name:            p.name,
				price:           p.price,
				stock_quantity:  p.stock ?? 0,
				track_inventory: p.stock !== undefined,
				created_by:      ownerId,
			})),
			{ onConflict: "facility_id,name" }
		)
		.throwOnError();

	step("Products (10)");

	console.log(`\n✅ Done!\n`);
	console.log(`   URL:      ${url}`);
	console.log(`   Studio:   http://127.0.0.1:54323`);
	console.log(`   Login:    owner@clubos.app`);
	console.log(`   Password: ${PASSWORD}\n`);
}

seed().catch((e: unknown) => {
	console.error("\n❌", e instanceof Error ? e.message : e);
	process.exit(1);
});
