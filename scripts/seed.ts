/**
 * ClubOS Database Seeder
 * Creates demo data for development and testing
 */

/* eslint-disable no-console */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
	throw new Error("Missing PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
	auth: { autoRefreshToken: false, persistSession: false },
});

// Demo credentials - change these in production!
const DEMO_USERS = [
	{
		email: "owner@clubos.app",
		password: "Owner123!",
		fullName: "Demo Owner",
		role: "owner" as const,
	},
	{
		email: "admin@clubos.app",
		password: "Admin123!",
		fullName: "Demo Admin",
		role: "admin" as const,
	},
	{
		email: "manager@clubos.app",
		password: "Manager123!",
		fullName: "Demo Manager",
		role: "manager" as const,
	},
	{
		email: "staff@clubos.app",
		password: "Staff123!",
		fullName: "Demo Staff",
		role: "staff" as const,
	},
] as const;

const DEMO_TENANT = {
	name: "Demo Club",
	slug: "demo-club",
	settings: {
		currency_code: "EUR",
		date_format: "DD/MM/YYYY",
		time_format: "24h",
	},
};

const DEMO_FACILITY = {
	name: "Main Facility",
	timezone: "Europe/Athens",
	settings: {
		opening_time: "08:00",
		closing_time: "23:00",
	},
};

const DEMO_CATEGORIES = [
	{ name: "Καφέδες", color: "#8B4513" },
	{ name: "Σνακ", color: "#FFD700" },
	{ name: "Αναψυκτικά", color: "#00CED1" },
];

const DEMO_PRODUCTS = [
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
	console.log("\n🚀 ClubOS Database Seeder\n");
	console.log("=".repeat(50));

	// 1. Create Tenant
	console.log("\n📦 Creating tenant...");
	const { data: tenant, error: tenantError } = await supabase
		.from("tenants")
		.upsert(
			{
				name: DEMO_TENANT.name,
				slug: DEMO_TENANT.slug,
				settings: DEMO_TENANT.settings,
			},
			{ onConflict: "slug" }
		)
		.select("id")
		.single();

	if (tenantError || !tenant) {
		throw new Error(`Failed to create tenant: ${tenantError?.message}`);
	}
	console.log(`   ✓ Tenant: ${DEMO_TENANT.name} (${tenant.id})`);

	// 2. Create Subscription (14-day trial)
	console.log("\n💳 Creating subscription...");
	const trialEnd = new Date();
	trialEnd.setDate(trialEnd.getDate() + 14);

	await supabase.from("subscriptions").upsert(
		{
			tenant_id: tenant.id,
			status: "trialing",
			plan_name: "Trial",
			trial_end: trialEnd.toISOString(),
			current_period_end: trialEnd.toISOString(),
		},
		{ onConflict: "tenant_id" }
	);
	console.log(`   ✓ Trial subscription (expires: ${trialEnd.toLocaleDateString()})`);

	// 3. Create Facility
	console.log("\n🏢 Creating facility...");
	const { data: facility, error: facilityError } = await supabase
		.from("facilities")
		.upsert(
			{
				tenant_id: tenant.id,
				name: DEMO_FACILITY.name,
				timezone: DEMO_FACILITY.timezone,
				settings: DEMO_FACILITY.settings,
			},
			{ onConflict: "tenant_id,name" }
		)
		.select("id")
		.single();

	if (facilityError || !facility) {
		throw new Error(`Failed to create facility: ${facilityError?.message}`);
	}
	console.log(`   ✓ Facility: ${DEMO_FACILITY.name} (${facility.id})`);

	// 4. Create Users and Memberships
	console.log("\n👥 Creating users...");
	const userIds: Record<string, string> = {};

	for (const userData of DEMO_USERS) {
		// Check if user exists
		const { data: existingUsers } = await supabase.auth.admin.listUsers();
		let userId = existingUsers.users.find((u) => u.email === userData.email)?.id;

		// Create user if not exists
		if (!userId) {
			const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
				email: userData.email,
				password: userData.password,
				email_confirm: true,
				user_metadata: { full_name: userData.fullName, role: userData.role },
			});

			if (userError || !newUser.user) {
				console.error(`   ✗ Failed to create ${userData.email}: ${userError?.message}`);
				continue;
			}
			userId = newUser.user.id;
		}

		// Upsert user profile
		await supabase.from("users").upsert(
			{
				id: userId,
				email: userData.email,
				full_name: userData.fullName,
			},
			{ onConflict: "id" }
		);

		// Create membership
		const isPrimary = userData.role === "owner";
		const facilityIdForMembership = userData.role === "staff" ? facility.id : null;

		await supabase.from("memberships").upsert(
			{
				user_id: userId,
				tenant_id: tenant.id,
				facility_id: facilityIdForMembership,
				role: userData.role,
				is_primary: isPrimary,
			},
			{ onConflict: "user_id,tenant_id,facility_id" }
		);

		userIds[userData.role] = userId;
		console.log(`   ✓ ${userData.role.padEnd(8)} ${userData.email}`);
	}

	// 5. Create Categories
	console.log("\n📂 Creating categories...");
	const categoryIds: Record<string, string> = {};

	for (const cat of DEMO_CATEGORIES) {
		const { data } = await supabase
			.from("categories")
			.upsert({ facility_id: facility.id, name: cat.name, color: cat.color }, { onConflict: "facility_id,name" })
			.select("id")
			.single();

		if (data) {
			categoryIds[cat.name] = data.id;
		}
	}
	console.log(`   ✓ ${DEMO_CATEGORIES.length} categories created`);

	// 6. Create Products
	console.log("\n🛍️  Creating products...");
	for (const product of DEMO_PRODUCTS) {
		await supabase.from("products").upsert(
			{
				facility_id: facility.id,
				category_id: categoryIds[product.category],
				name: product.name,
				price: product.price,
				stock_quantity: product.stock ?? 0,
				track_inventory: !!product.stock,
				created_by: userIds.owner,
			},
			{ onConflict: "facility_id,name" }
		);
	}
	console.log(`   ✓ ${DEMO_PRODUCTS.length} products created`);

	// Summary
	console.log("\n" + "=".repeat(50));
	console.log("\n✅ Seeding complete!\n");
	console.log("📋 Demo Credentials:");
	console.log("-".repeat(50));
	console.log("Role     | Email                | Password");
	console.log("-".repeat(50));
	for (const user of DEMO_USERS) {
		console.log(`${user.role.padEnd(8)} | ${user.email.padEnd(20)} | ${user.password}`);
	}
	console.log("-".repeat(50));
	console.log("\n");
}

seed().catch((error) => {
	console.error("\n❌ Seeding failed:", error.message);
	process.exit(1);
});
