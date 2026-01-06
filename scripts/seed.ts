/* eslint-disable no-console */
import { createClient } from "@supabase/supabase-js";

const env = (name: string): string => {
	const value = process.env[name];
	if (!value) throw new Error(`Missing ${name}`);
	return value;
};

const supabase = createClient(env("PUBLIC_SUPABASE_URL"), env("SUPABASE_SECRET_KEY"), {
	auth: { autoRefreshToken: false, persistSession: false },
});

const PASSWORD = env("SEED_PASSWORD");

const USERS = [
	{ email: "owner@clubos.app", name: "Demo Owner", role: "owner" },
	{ email: "admin@clubos.app", name: "Demo Admin", role: "admin" },
	{ email: "manager@clubos.app", name: "Demo Manager", role: "manager" },
	{ email: "staff@clubos.app", name: "Demo Staff", role: "staff" },
];

const CATEGORIES = [
	{ name: "Καφέδες", color: "#8B4513" },
	{ name: "Σνακ", color: "#FFD700" },
	{ name: "Αναψυκτικά", color: "#00CED1" },
];

const PRODUCTS = [
	{ name: "Espresso", price: 2.0, category: "Καφέδες" },
	{ name: "Cappuccino", price: 3.0, category: "Καφέδες" },
	{ name: "Freddo Espresso", price: 3.0, category: "Καφέδες" },
	{ name: "Freddo Cappuccino", price: 3.5, category: "Καφέδες" },
	{ name: "Κρουασάν", price: 2.5, category: "Σνακ", stock: 20 },
	{ name: "Τοστ", price: 3.0, category: "Σνακ", stock: 15 },
	{ name: "Σάντουιτς", price: 4.0, category: "Σνακ", stock: 10 },
	{ name: "Νερό 500ml", price: 0.5, category: "Αναψυκτικά", stock: 50 },
	{ name: "Coca-Cola", price: 2.0, category: "Αναψυκτικά", stock: 30 },
	{ name: "Πορτοκαλάδα", price: 2.0, category: "Αναψυκτικά", stock: 30 },
];

async function seed(): Promise<void> {
	console.log("\n🌱 Seeding ClubOS...\n");

	// Tenant
	const { data: tenant } = await supabase
		.from("tenants")
		.upsert({ name: "Demo Club", slug: "demo-club", settings: { currency_code: "EUR" } }, { onConflict: "slug" })
		.select("id")
		.single()
		.throwOnError();

	if (!tenant) throw new Error("Failed to create tenant");
	console.log("✓ Tenant");

	// Subscription (14-day trial)
	const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
	await supabase
		.from("subscriptions")
		.upsert(
			{ tenant_id: tenant.id, status: "trialing", plan_name: "Trial", trial_end: trialEnd, current_period_end: trialEnd },
			{ onConflict: "tenant_id" }
		)
		.throwOnError();
	console.log("✓ Subscription");

	// Facility
	const { data: facility } = await supabase
		.from("facilities")
		.upsert(
			{ tenant_id: tenant.id, name: "Main Facility", timezone: "Europe/Athens", settings: { opening_time: "08:00", closing_time: "23:00" } },
			{ onConflict: "tenant_id,name" }
		)
		.select("id")
		.single()
		.throwOnError();

	if (!facility) throw new Error("Failed to create facility");
	console.log("✓ Facility");

	// Users
	const { data: existingUsers } = await supabase.auth.admin.listUsers();
	const existingEmails = new Set(existingUsers.users.map((u) => u.email));
	let ownerId: string | undefined;

	for (const user of USERS) {
		let userId = existingUsers.users.find((u) => u.email === user.email)?.id;

		if (!existingEmails.has(user.email)) {
			const { data } = await supabase.auth.admin.createUser({
				email: user.email,
				password: PASSWORD,
				email_confirm: true,
				user_metadata: { full_name: user.name },
			});
			userId = data.user?.id;
		}

		if (!userId) continue;
		if (user.role === "owner") ownerId = userId;

		await supabase.from("users").upsert({ id: userId, email: user.email, full_name: user.name }, { onConflict: "id" });
		await supabase.from("memberships").upsert(
			{
				user_id: userId,
				tenant_id: tenant.id,
				facility_id: user.role === "staff" ? facility.id : null,
				role: user.role,
				is_primary: user.role === "owner",
			},
			{ onConflict: "user_id,tenant_id,facility_id" }
		);
	}
	console.log("✓ Users (4)");

	// Categories
	const categoryIds: Record<string, string> = {};
	for (const cat of CATEGORIES) {
		const { data } = await supabase
			.from("categories")
			.upsert({ facility_id: facility.id, name: cat.name, color: cat.color }, { onConflict: "facility_id,name" })
			.select("id")
			.single();
		if (data) categoryIds[cat.name] = data.id;
	}
	console.log("✓ Categories (3)");

	// Products
	for (const p of PRODUCTS) {
		await supabase.from("products").upsert(
			{
				facility_id: facility.id,
				category_id: categoryIds[p.category],
				name: p.name,
				price: p.price,
				stock_quantity: p.stock ?? 0,
				track_inventory: !!p.stock,
				created_by: ownerId,
			},
			{ onConflict: "facility_id,name" }
		);
	}
	console.log("✓ Products (10)");

	console.log("\n✅ Done! Login: owner@clubos.app / " + PASSWORD + "\n");
}

seed().catch((e: Error) => {
	console.error("❌", e.message);
	process.exit(1);
});
