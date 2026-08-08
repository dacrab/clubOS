/**
 * ClubOS Demo Seed — creates a demo tenant (Demo Club) with subscription, facility,
 * 4 users, 3 categories and 10 products. Run via `bun run db:seed`.
 * Requires DATABASE_URL and SEED_PASSWORD (CLERK_SECRET_KEY optional).
 */

import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { categories } from "../src/lib/db/schema/categories";
import { facilities } from "../src/lib/db/schema/facilities";
import { memberships } from "../src/lib/db/schema/memberships";
import { products } from "../src/lib/db/schema/products";
import { subscriptions } from "../src/lib/db/schema/subscriptions";
import { tenants } from "../src/lib/db/schema/tenants";
import { users } from "../src/lib/db/schema/users";
import { DAY_MS } from "../src/lib/types/database";

// ─── Env validation ───

const DATABASE_URL = process.env.DATABASE_URL;
const PASSWORD = process.env.SEED_PASSWORD;

if (!DATABASE_URL || !PASSWORD) {
	console.error("Missing env: DATABASE_URL, SEED_PASSWORD");
	process.exit(1);
}

const client = postgres(DATABASE_URL, { prepare: false });
const db = drizzle(client);

// ─── Clerk Admin Client (optional) ───

async function createClerkUser(email: string, password: string, name: string) {
	const key = process.env.CLERK_SECRET_KEY;
	if (!key) {
		console.warn("CLERK_SECRET_KEY not set - using placeholder IDs");
		return `placeholder-${email.replace(/[^a-z0-9]/g, "-")}`;
	}

	const res = await fetch("https://api.clerk.com/v1/users", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${key}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			email_address: [email],
			password,
			first_name: name,
			public_metadata: { role: "owner" },
		}),
	});

	if (!res.ok) {
		const body = await res.text();
		throw new Error(`Clerk API error: ${res.status} ${body}`);
	}

	const data = await res.json();
	return data.id;
}

// ─── Seed data ───

const USERS = [
	{ email: "owner@clubos.app", name: "Demo Owner", role: "owner" as const },
	{ email: "admin@clubos.app", name: "Demo Admin", role: "admin" as const },
	{ email: "manager@clubos.app", name: "Demo Manager", role: "manager" as const },
	{ email: "staff@clubos.app", name: "Demo Staff", role: "staff" as const },
] as const;

const CATEGORIES = ["Καφέδες", "Σνακ", "Αναψυκτικά"] as const;
type Category = (typeof CATEGORIES)[number];

const PRODUCTS: { name: string; price: number; cat: Category; stock?: number }[] = [
	{ name: "Espresso", price: 2.0, cat: "Καφέδες" },
	{ name: "Cappuccino", price: 3.0, cat: "Καφέδες" },
	{ name: "Freddo Espresso", price: 3.0, cat: "Καφέδες" },
	{ name: "Freddo Cappuccino", price: 3.5, cat: "Καφέδες" },
	{ name: "Κρουασάν", price: 2.5, cat: "Σνακ", stock: 20 },
	{ name: "Τοστ", price: 3.0, cat: "Σνακ", stock: 15 },
	{ name: "Σάντουιτς", price: 4.0, cat: "Σνακ", stock: 10 },
	{ name: "Νερό 500ml", price: 0.5, cat: "Αναψυκτικά", stock: 50 },
	{ name: "Coca-Cola", price: 2.0, cat: "Αναψυκτικά", stock: 30 },
	{ name: "Πορτοκαλάδα", price: 2.0, cat: "Αναψυκτικά", stock: 30 },
];

// ─── Helpers ───

function step(msg: string): void {
	console.log(`  ✓ ${msg}`);
}

function warn(msg: string): void {
	console.warn(`  ⚠ ${msg}`);
}

// ─── Seed ───

async function seed(): Promise<void> {
	console.log("\n🌱 Seeding ClubOS...\n");

	// ── Tenant ──
	const [tenant] = await db
		.insert(tenants)
		.values({ name: "Demo Club", slug: "demo-club", settings: { currency_code: "EUR" } })
		.onConflictDoUpdate({ target: tenants.slug, set: { name: "Demo Club" } })
		.returning();

	// ── Subscription ──
	const trialEnd = new Date(Date.now() + 14 * DAY_MS);
	await db
		.insert(subscriptions)
		.values({
			tenantId: tenant.id,
			status: "trialing",
			planName: "Trial",
			trialEnd,
			currentPeriodEnd: trialEnd,
		})
		.onConflictDoUpdate({
			target: subscriptions.tenantId,
			set: { status: "trialing", trialEnd, currentPeriodEnd: trialEnd },
		});

	// ── Facility ──
	const [facility] = await db
		.insert(facilities)
		.values({ tenantId: tenant.id, name: "Main Facility" })
		.onConflictDoNothing()
		.returning();

	step("Tenant + Subscription + Facility");

	// ── Users ──
	let ownerId: string | undefined;

	for (const u of USERS) {
		let userId: string;
		try {
			userId = await createClerkUser(u.email, PASSWORD, u.name);
		} catch (e) {
			warn(`Failed to create Clerk user ${u.email}: ${e}`);
			continue;
		}

		await db
			.insert(users)
			.values({ id: userId, fullName: u.name })
			.onConflictDoUpdate({ target: users.id, set: { fullName: u.name } });

		if (u.role === "owner") ownerId = userId;

		const facilityId: string | null = u.role === "staff" ? facility.id : null;

		const existing = await db
			.select({ id: memberships.id })
			.from(memberships)
			.where(
				facilityId
					? sql`user_id = ${userId} AND tenant_id = ${tenant.id} AND facility_id = ${facilityId}`
					: sql`user_id = ${userId} AND tenant_id = ${tenant.id} AND facility_id IS NULL`,
			)
			.limit(1);

		if (!existing.length) {
			await db.insert(memberships).values({
				userId,
				tenantId: tenant.id,
				facilityId,
				role: u.role,
				isPrimary: u.role === "owner",
			});
		}
	}

	if (!ownerId) throw new Error("Owner user not created — cannot seed products");
	step("Users (4)");

	// ── Categories ──
	const catRows = await db
		.insert(categories)
		.values(CATEGORIES.map((name) => ({ facilityId: facility.id, name })))
		.onConflictDoNothing()
		.returning({ id: categories.id, name: categories.name });

	const catMap = Object.fromEntries(catRows.map((c) => [c.name, c.id])) as Record<Category, string>;
	step("Categories (3)");

	// ── Products ──
	await db
		.insert(products)
		.values(
			PRODUCTS.map((p) => ({
				facilityId: facility.id,
				categoryId: catMap[p.cat],
				name: p.name,
				price: p.price,
				stockQuantity: p.stock ?? 0,
				trackInventory: p.stock !== undefined,
				createdBy: ownerId,
			})),
		)
		.onConflictDoNothing();
	step("Products (10)");

	console.log(`\n✅ Done!\n`);
	console.log(`   Login:    owner@clubos.app`);
	console.log(`   Password: ${PASSWORD}\n`);
}

seed().catch((e: unknown) => {
	console.error("\n❌", e instanceof Error ? e.message : e);
	process.exit(1);
});
