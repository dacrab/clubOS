import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Types
type UserRole = "admin" | "staff" | "secretary";
type Category = { id: string; name: string };
type Product = { id: string; name: string; price: number };

interface UserConfig {
	email: string;
	password: string;
	username: string;
	role: UserRole;
}

interface Context {
	tenantId: string;
	facilityId: string;
}

// Configuration
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY;

if (!(supabaseUrl && supabaseServiceKey)) {
	throw new Error("Missing PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in env");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
	auth: { autoRefreshToken: false, persistSession: false },
});

function getSeedPassword(role: "admin" | "staff" | "secretary"): string {
	const envKey = `SEED_${role.toUpperCase()}_PASSWORD`;
	const value = process.env[envKey];
	if (value?.trim()) return value;
	return `seed-${role}-${randomUUID()}`;
}

const CONFIG = {
	tenantName: "Demo Club",
	facilityName: "Main Facility",
	admin: {
		email: "admin@example.com",
		password: getSeedPassword("admin"),
		username: "Admin User",
		role: "admin" as const,
	},
	staff: {
		email: "staff@example.com",
		password: getSeedPassword("staff"),
		username: "Staff User",
		role: "staff" as const,
	},
	secretary: {
		email: "secretary@example.com",
		password: getSeedPassword("secretary"),
		username: "Secretary User",
		role: "secretary" as const,
	},
};

const DAY_MS = 24 * 60 * 60 * 1000;

// Helper functions
async function ensureMemberships(
	userId: string,
	tenantId: string,
	facilityId: string,
): Promise<void> {
	await Promise.all([
		supabase
			.from("tenant_members")
			.upsert(
				{ tenant_id: tenantId, user_id: userId },
				{ onConflict: "tenant_id,user_id" },
			),
		supabase
			.from("facility_members")
			.upsert(
				{ facility_id: facilityId, user_id: userId },
				{ onConflict: "facility_id,user_id" },
			),
	]);
}

async function normalizeMemberships(
	userId: string,
	tenantId: string,
	facilityId: string,
): Promise<void> {
	await ensureMemberships(userId, tenantId, facilityId);
	await Promise.all([
		supabase
			.from("tenant_members")
			.delete()
			.eq("user_id", userId)
			.neq("tenant_id", tenantId),
		supabase
			.from("facility_members")
			.delete()
			.eq("user_id", userId)
			.neq("facility_id", facilityId),
	]);
}

async function ensureProfileUser(
	userId: string,
	username: string,
	role: UserRole,
): Promise<void> {
	const { data: existing } = await supabase
		.from("users")
		.select("id")
		.eq("id", userId)
		.maybeSingle();

	if (existing?.id) {
		await supabase.from("users").update({ username, role }).eq("id", userId);
		return;
	}

	await supabase.from("users").insert({ id: userId, username, role });
}

async function findAuthUserByEmail(email: string): Promise<string | null> {
	const { data } = await supabase.auth.admin.listUsers({
		page: 1,
		perPage: 1000,
	});
	const user = data.users.find(
		(u) => u.email?.toLowerCase() === email.toLowerCase(),
	);
	return user?.id ?? null;
}

async function createAuthUser(config: UserConfig): Promise<string> {
	const { data, error } = await supabase.auth.admin.createUser({
		email: config.email,
		password: config.password,
		user_metadata: { role: config.role, username: config.username },
		email_confirm: true,
	});

	if (error) throw new Error(`User creation failed: ${error.message}`);
	if (!data.user?.id) throw new Error("User creation did not return a user id");

	return data.user.id;
}

async function ensureUser(
	config: UserConfig,
	context: Context,
): Promise<string> {
	const existingAuthId = await findAuthUserByEmail(config.email);

	if (existingAuthId) {
		await ensureProfileUser(existingAuthId, config.username, config.role);
		await ensureMemberships(
			existingAuthId,
			context.tenantId,
			context.facilityId,
		);
		process.stdout.write(`User exists: ${config.email}\n`);
		return existingAuthId;
	}

	const userId = await createAuthUser(config);
	await ensureProfileUser(userId, config.username, config.role);
	await ensureMemberships(userId, context.tenantId, context.facilityId);
	process.stdout.write(`Created user: ${config.username}\n`);
	return userId;
}

async function ensureEntity<T extends { id: string }>(opts: {
	table: string;
	findBy: Record<string, unknown>;
	insert: Record<string, unknown>;
	select?: string;
}): Promise<T> {
	const { data: existing } = await supabase
		.from(opts.table)
		.select(opts.select ?? "id")
		.match(opts.findBy)
		.maybeSingle();

	if (existing) return existing as unknown as T;

	const { data, error } = await supabase
		.from(opts.table)
		.insert(opts.insert)
		.select(opts.select ?? "id")
		.single();

	if (error) {
		throw new Error(`Failed to create ${opts.table}: ${error.message}`);
	}

	return data as unknown as T;
}

async function ensureTenantAndFacility(): Promise<Context> {
	const tenant = await ensureEntity<{ id: string }>({
		table: "tenants",
		findBy: { name: CONFIG.tenantName },
		insert: { name: CONFIG.tenantName },
	});

	process.stdout.write(`Using tenant: ${CONFIG.tenantName}\n`);

	const facility = await ensureEntity<{ id: string }>({
		table: "facilities",
		findBy: { tenant_id: tenant.id, name: CONFIG.facilityName },
		insert: { tenant_id: tenant.id, name: CONFIG.facilityName },
	});

	process.stdout.write(`Using facility: ${CONFIG.facilityName}\n`);

	return { tenantId: tenant.id, facilityId: facility.id };
}

async function ensureTenantSettings(context: Context): Promise<void> {
	await Promise.all([
		supabase
			.from("tenant_settings")
			.upsert(
				{ tenant_id: context.tenantId, facility_id: context.facilityId },
				{ onConflict: "tenant_id,facility_id" },
			),
		supabase
			.from("tenant_settings")
			.upsert({ tenant_id: context.tenantId }, { onConflict: "tenant_id" }),
	]);
}

async function ensureUserPreferences(userId: string): Promise<void> {
	await supabase
		.from("user_preferences")
		.upsert({ user_id: userId }, { onConflict: "user_id" });
}

async function seedCategories(
	adminId: string,
	context: Context,
): Promise<Map<string, Category>> {
	const categoryMap = new Map<string, Category>();

	async function ensureCategory(
		name: string,
		description: string,
		parentId?: string,
	): Promise<Category> {
		const existing = categoryMap.get(name);
		if (existing) return existing;

		const { data: found } = await supabase
			.from("categories")
			.select("id, name")
			.eq("tenant_id", context.tenantId)
			.eq("facility_id", context.facilityId)
			.ilike("name", name)
			.maybeSingle();

		if (found) {
			categoryMap.set(name, found as Category);
			return found as Category;
		}

		const { data, error } = await supabase
			.from("categories")
			.insert({
				name,
				description,
				parent_id: parentId,
				created_by: adminId,
				tenant_id: context.tenantId,
				facility_id: context.facilityId,
			})
			.select("id,name")
			.single();

		if (error)
			throw new Error(`Failed to create category ${name}: ${error.message}`);

		const category = data as Category;
		categoryMap.set(name, category);
		return category;
	}

	const rootCategory = await ensureCategory("Καφέδες", "Όλα τα είδη καφέ");
	await Promise.all([
		ensureCategory("Ζεστοί Καφέδες", "Ζεστοί καφέδες", rootCategory.id),
		ensureCategory("Κρύοι Καφέδες", "Κρύοι καφέδες", rootCategory.id),
		ensureCategory("Ροφήματα", "Διάφορα ροφήματα"),
		ensureCategory("Σνακ", "Διάφορα σνακ"),
	]);

	process.stdout.write("Ensured categories\n");
	return categoryMap;
}

async function seedProducts(
	categories: Map<string, Category>,
	adminId: string,
	context: Context,
): Promise<Map<string, Product>> {
	const productData = [
		{ name: "Espresso", price: 2.0, categoryName: "Ζεστοί Καφέδες" },
		{ name: "Cappuccino", price: 3.0, categoryName: "Ζεστοί Καφέδες" },
		{ name: "Latte", price: 3.5, categoryName: "Ζεστοί Καφέδες" },
		{ name: "Freddo Espresso", price: 3.0, categoryName: "Κρύοι Καφέδες" },
		{ name: "Freddo Cappuccino", price: 3.5, categoryName: "Κρύοι Καφέδες" },
		{ name: "Iced Latte", price: 4.0, categoryName: "Κρύοι Καφέδες" },
		{ name: "Σοκολάτα", price: 3.5, categoryName: "Ροφήματα" },
		{ name: "Τσάι", price: 2.5, categoryName: "Ροφήματα" },
		{ name: "Χυμός Πορτοκάλι", price: 3.0, categoryName: "Ροφήματα" },
		{ name: "Κρουασάν", price: 2.0, categoryName: "Σνακ", stock: 20 },
		{ name: "Σάντουιτς", price: 3.5, categoryName: "Σνακ", stock: 15 },
		{ name: "Τοστ", price: 2.5, categoryName: "Σνακ", stock: 25 },
	];

	const productMap = new Map<string, Product>();

	for (const p of productData) {
		const { data: existing } = await supabase
			.from("products")
			.select("id,name,price")
			.eq("tenant_id", context.tenantId)
			.eq("facility_id", context.facilityId)
			.ilike("name", p.name)
			.maybeSingle();

		if (existing) {
			productMap.set(p.name, existing as Product);
			continue;
		}

		const category = categories.get(p.categoryName);
		const { data: created, error } = await supabase
			.from("products")
			.insert({
				name: p.name,
				price: p.price,
				stock_quantity: ("stock" in p ? p.stock : undefined) ?? -1,
				category_id: category?.id,
				created_by: adminId,
				tenant_id: context.tenantId,
				facility_id: context.facilityId,
			})
			.select("id,name,price")
			.single();

		if (error)
			throw new Error(`Failed to create product ${p.name}: ${error.message}`);
		productMap.set(p.name, created as Product);
	}

	process.stdout.write("Ensured products\n");
	return productMap;
}

async function seedRegisterSession(
	adminId: string,
	context: Context,
): Promise<string> {
	const { data: existing } = await supabase
		.from("register_sessions")
		.select("id")
		.eq("tenant_id", context.tenantId)
		.eq("facility_id", context.facilityId)
		.is("closed_at", null)
		.maybeSingle();

	if (existing?.id) {
		process.stdout.write("Reusing open register session\n");
		return existing.id;
	}

	const { data, error } = await supabase
		.from("register_sessions")
		.insert({
			opened_by: adminId,
			tenant_id: context.tenantId,
			facility_id: context.facilityId,
		})
		.select("id")
		.single();

	if (error)
		throw new Error(`Failed to create register session: ${error.message}`);
	process.stdout.write("Created register session\n");
	return data.id;
}

async function seedOrders(opts: {
	sessionId: string;
	products: Map<string, Product>;
	staffId: string;
	context: Context;
}): Promise<void> {
	const { sessionId, products, staffId, context } = opts;

	const espresso = products.get("Espresso");
	const chocolate = products.get("Σοκολάτα");
	const croissant = products.get("Κρουασάν");

	if (!(espresso && chocolate && croissant)) {
		throw new Error("Required products missing for order items");
	}

	const { data: existing } = await supabase
		.from("orders")
		.select("id")
		.eq("session_id", sessionId)
		.maybeSingle();

	if (existing?.id) {
		process.stdout.write("Sample order exists — skipping\n");
		return;
	}

	const prices = {
		espresso: Number(espresso.price),
		chocolate: Number(chocolate.price),
		croissant: Number(croissant.price),
	};

	const subtotal = prices.espresso + prices.chocolate + prices.croissant;
	const discountAmount = prices.espresso;
	const totalAmount = subtotal - discountAmount;

	const { data: order, error: orderError } = await supabase
		.from("orders")
		.insert({
			session_id: sessionId,
			subtotal,
			discount_amount: discountAmount,
			total_amount: totalAmount,
			coupon_count: 0,
			created_by: staffId,
			tenant_id: context.tenantId,
			facility_id: context.facilityId,
		})
		.select("id")
		.single();

	if (orderError)
		throw new Error(`Failed to create order: ${orderError.message}`);

	const orderItems = [
		{
			order_id: order.id,
			product_id: espresso.id,
			quantity: 1,
			unit_price: prices.espresso,
			line_total: 0,
			is_treat: true,
		},
		{
			order_id: order.id,
			product_id: chocolate.id,
			quantity: 1,
			unit_price: prices.chocolate,
			line_total: prices.chocolate,
			is_treat: false,
		},
		{
			order_id: order.id,
			product_id: croissant.id,
			quantity: 1,
			unit_price: prices.croissant,
			line_total: prices.croissant,
			is_treat: false,
		},
	];

	const { error: itemsError } = await supabase
		.from("order_items")
		.insert(orderItems);
	if (itemsError)
		throw new Error(`Failed to create order items: ${itemsError.message}`);

	process.stdout.write("Created sample order\n");
}

async function seedAppointments(
	staffId: string,
	context: Context,
): Promise<void> {
	const appointments = [
		{
			customer_name: "Μαρία Παπαδοπούλου",
			contact_info: "6912345678",
			appointment_date: new Date(Date.now() + 2 * DAY_MS),
			num_children: 3,
			num_adults: 2,
			notes: "Γενέθλια παιδιού",
		},
		{
			customer_name: "Γιώργος Δημητρίου",
			contact_info: "6923456789",
			appointment_date: new Date(Date.now() + 3 * DAY_MS),
			num_children: 5,
			num_adults: 3,
			notes: "Σχολική εκδρομή",
		},
	];

	for (const appointment of appointments) {
		const { data: existing } = await supabase
			.from("appointments")
			.select("id")
			.eq("tenant_id", context.tenantId)
			.eq("facility_id", context.facilityId)
			.eq("appointment_date", appointment.appointment_date.toISOString())
			.ilike("customer_name", appointment.customer_name)
			.maybeSingle();

		if (existing?.id) continue;

		const { error } = await supabase.from("appointments").insert({
			...appointment,
			created_by: staffId,
			tenant_id: context.tenantId,
			facility_id: context.facilityId,
		});

		if (error) {
			throw new Error(
				`Failed to create appointment for ${appointment.customer_name}: ${error.message}`,
			);
		}
	}

	process.stdout.write("Ensured appointments\n");
}

async function seedFootballBookings(
	staffId: string,
	context: Context,
): Promise<void> {
	const bookings = [
		{
			customer_name: "Νίκος Αντωνίου",
			contact_info: "6934567890",
			booking_datetime: new Date(Date.now() + DAY_MS),
			field_number: 1,
			num_players: 10,
			notes: "Εβδομαδιαίο παιχνίδι",
		},
		{
			customer_name: "Κώστας Νικολάου",
			contact_info: "6945678901",
			booking_datetime: new Date(Date.now() + 2 * DAY_MS),
			field_number: 2,
			num_players: 8,
			notes: "Φιλικό παιχνίδι",
		},
	];

	for (const booking of bookings) {
		const { data: existing } = await supabase
			.from("football_bookings")
			.select("id")
			.eq("tenant_id", context.tenantId)
			.eq("facility_id", context.facilityId)
			.eq("booking_datetime", booking.booking_datetime.toISOString())
			.eq("field_number", booking.field_number)
			.maybeSingle();

		if (existing?.id) continue;

		const { error } = await supabase.from("football_bookings").insert({
			...booking,
			created_by: staffId,
			tenant_id: context.tenantId,
			facility_id: context.facilityId,
		});

		if (error) {
			throw new Error(
				`Failed to create football booking for field ${booking.field_number}: ${error.message}`,
			);
		}
	}

	process.stdout.write("Ensured football bookings\n");
}

async function main(): Promise<void> {
	try {
		process.stdout.write("Starting database seeding...\n");

		const context = await ensureTenantAndFacility();
		const adminId = await ensureUser(CONFIG.admin, context);
		await normalizeMemberships(adminId, context.tenantId, context.facilityId);

		const staffId = await ensureUser(CONFIG.staff, context);
		await normalizeMemberships(staffId, context.tenantId, context.facilityId);

		const secretaryId = await ensureUser(CONFIG.secretary, context);
		await normalizeMemberships(
			secretaryId,
			context.tenantId,
			context.facilityId,
		);

		await ensureTenantSettings(context);
		await Promise.all([
			ensureUserPreferences(adminId),
			ensureUserPreferences(staffId),
			ensureUserPreferences(secretaryId),
		]);

		const categories = await seedCategories(adminId, context);
		const products = await seedProducts(categories, adminId, context);
		const sessionId = await seedRegisterSession(adminId, context);

		await Promise.all([
			seedOrders({ sessionId, products, staffId, context }),
			seedAppointments(staffId, context),
			seedFootballBookings(staffId, context),
		]);

		process.stdout.write("Database seeding completed successfully!\n");
	} catch (error) {
		process.stderr.write(`ERROR: Seeding failed: ${String(error)}\n`);
		process.exit(1);
	}
}

main();
