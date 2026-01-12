/* eslint-disable no-console */
import { createClient } from "@supabase/supabase-js";

const url = process.env.PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
const PASSWORD = process.env.SEED_PASSWORD;

if (!url || !key || !PASSWORD) {
	console.error("❌ Missing env: PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, SEED_PASSWORD");
	process.exit(1);
}

const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const USERS = [
	{ email: "owner@clubos.app", name: "Demo Owner", role: "owner" as const },
	{ email: "admin@clubos.app", name: "Demo Admin", role: "admin" as const },
	{ email: "manager@clubos.app", name: "Demo Manager", role: "manager" as const },
	{ email: "staff@clubos.app", name: "Demo Staff", role: "staff" as const },
];

const PRODUCTS = [
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

async function seed(): Promise<void> {
	console.log("\n🌱 Seeding ClubOS...\n");

	const { data: tenant } = await supabase.from("tenants").upsert({ name: "Demo Club", slug: "demo-club", settings: { currency_code: "EUR" } }, { onConflict: "slug" }).select("id").single().throwOnError();
	if (!tenant) throw new Error("Failed to create tenant");

	const trialEnd = new Date(Date.now() + 14 * 86400000).toISOString();
	await supabase.from("subscriptions").upsert({ tenant_id: tenant.id, status: "trialing", plan_name: "Trial", trial_end: trialEnd, current_period_end: trialEnd }, { onConflict: "tenant_id" }).throwOnError();

	const { data: facility } = await supabase.from("facilities").upsert({ tenant_id: tenant.id, name: "Main Facility" }, { onConflict: "tenant_id,name" }).select("id").single().throwOnError();
	if (!facility) throw new Error("Failed to create facility");
	console.log("✓ Tenant + Subscription + Facility");

	const { data: existing } = await supabase.auth.admin.listUsers();
	const emails = new Set(existing.users.map((u) => u.email));
	let ownerId: string | undefined;

	for (const u of USERS) {
		let id = existing.users.find((x) => x.email === u.email)?.id;
		if (!emails.has(u.email)) {
			const { data } = await supabase.auth.admin.createUser({ email: u.email, password: PASSWORD, email_confirm: true, user_metadata: { full_name: u.name } });
			id = data.user?.id;
		}
		if (!id) continue;
		if (u.role === "owner") ownerId = id;
		await supabase.from("users").upsert({ id, full_name: u.name }, { onConflict: "id" });
		await supabase.from("memberships").upsert({ user_id: id, tenant_id: tenant.id, facility_id: u.role === "staff" ? facility.id : null, role: u.role, is_primary: u.role === "owner" }, { onConflict: "user_id,tenant_id,facility_id" });
	}
	console.log("✓ Users (4)");

	const cats: Record<string, string> = {};
	for (const name of ["Καφέδες", "Σνακ", "Αναψυκτικά"]) {
		const { data } = await supabase.from("categories").upsert({ facility_id: facility.id, name }, { onConflict: "facility_id,name" }).select("id").single();
		if (data) cats[name] = data.id;
	}
	console.log("✓ Categories (3)");

	for (const p of PRODUCTS) {
		await supabase.from("products").upsert({ facility_id: facility.id, category_id: cats[p.cat], name: p.name, price: p.price, stock_quantity: p.stock ?? 0, track_inventory: !!p.stock, created_by: ownerId }, { onConflict: "facility_id,name" });
	}
	console.log("✓ Products (10)");

	console.log(`\n✅ Done! Login: owner@clubos.app / ${PASSWORD}\n`);
}

seed().catch((e: Error) => { console.error("❌", e.message); process.exit(1); });
