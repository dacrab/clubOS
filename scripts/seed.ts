/**
 * ClubOS Database Seeder v2.0
 * Seeds the database with demo data for development/testing
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// ============================================================================
// Types
// ============================================================================

type UserRole = "admin" | "secretary" | "staff";

interface UserConfig {
	email: string;
	password: string;
	username: string;
	fullName: string;
	role: UserRole;
}

interface Context {
	supabase: SupabaseClient;
	tenantId: string;
	facilityId: string;
	users: {
		adminId: string;
		secretaryId: string;
		staffId: string;
	};
}

interface CategoryData {
	id: string;
	name: string;
}

interface ProductData {
	id: string;
	name: string;
	price: number;
}

// ============================================================================
// Configuration
// ============================================================================

dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
	throw new Error("Missing PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
	auth: { autoRefreshToken: false, persistSession: false },
});

// Demo user passwords from env or generate secure defaults
const getPassword = (role: UserRole): string => {
	const envKey = `SEED_${role.toUpperCase()}_PASSWORD`;
	return process.env[envKey] || `Demo${role.charAt(0).toUpperCase() + role.slice(1)}123!`;
};

const CONFIG = {
	tenant: {
		name: "Demo Sports Club",
		slug: "demo-sports-club",
	},
	facility: {
		name: "Main Facility",
		address: "123 Sports Avenue, Athens 10557",
		phone: "+30 210 1234567",
		email: "info@demosportsclub.gr",
		timezone: "Europe/Athens",
	},
	users: {
		admin: {
			email: "admin@example.com",
			password: getPassword("admin"),
			username: "admin",
			fullName: "Demo Administrator",
			role: "admin" as const,
		},
		secretary: {
			email: "secretary@example.com",
			password: getPassword("secretary"),
			username: "secretary",
			fullName: "Demo Secretary",
			role: "secretary" as const,
		},
		staff: {
			email: "staff@example.com",
			password: getPassword("staff"),
			username: "staff",
			fullName: "Demo Staff",
			role: "staff" as const,
		},
	},
	categories: [
		{ name: "Καφέδες", description: "Όλα τα είδη καφέ", color: "#8B4513", icon: "coffee" },
		{ name: "Ζεστοί Καφέδες", description: "Ζεστοί καφέδες", color: "#A0522D", icon: "coffee", parent: "Καφέδες" },
		{ name: "Κρύοι Καφέδες", description: "Κρύοι καφέδες", color: "#DEB887", icon: "coffee", parent: "Καφέδες" },
		{ name: "Ροφήματα", description: "Διάφορα ροφήματα", color: "#FF6347", icon: "cup-soda" },
		{ name: "Σνακ", description: "Σνακ και γλυκά", color: "#FFD700", icon: "cookie" },
		{ name: "Αναψυκτικά", description: "Αναψυκτικά και χυμοί", color: "#00CED1", icon: "glass-water" },
	],
	products: [
		// Hot Coffees
		{ name: "Espresso", price: 2.00, category: "Ζεστοί Καφέδες", stock: -1 },
		{ name: "Διπλός Espresso", price: 2.80, category: "Ζεστοί Καφέδες", stock: -1 },
		{ name: "Cappuccino", price: 3.00, category: "Ζεστοί Καφέδες", stock: -1 },
		{ name: "Latte", price: 3.50, category: "Ζεστοί Καφέδες", stock: -1 },
		{ name: "Americano", price: 2.50, category: "Ζεστοί Καφέδες", stock: -1 },
		{ name: "Ελληνικός", price: 2.00, category: "Ζεστοί Καφέδες", stock: -1 },
		// Cold Coffees
		{ name: "Freddo Espresso", price: 3.00, category: "Κρύοι Καφέδες", stock: -1 },
		{ name: "Freddo Cappuccino", price: 3.50, category: "Κρύοι Καφέδες", stock: -1 },
		{ name: "Iced Latte", price: 4.00, category: "Κρύοι Καφέδες", stock: -1 },
		{ name: "Cold Brew", price: 4.50, category: "Κρύοι Καφέδες", stock: -1 },
		{ name: "Frappe", price: 2.50, category: "Κρύοι Καφέδες", stock: -1 },
		// Beverages
		{ name: "Σοκολάτα Ζεστή", price: 3.50, category: "Ροφήματα", stock: -1 },
		{ name: "Σοκολάτα Κρύα", price: 4.00, category: "Ροφήματα", stock: -1 },
		{ name: "Τσάι", price: 2.50, category: "Ροφήματα", stock: -1 },
		{ name: "Χαμομήλι", price: 2.50, category: "Ροφήματα", stock: -1 },
		// Snacks
		{ name: "Κρουασάν Σοκολάτα", price: 2.50, category: "Σνακ", stock: 25 },
		{ name: "Κρουασάν Βούτυρο", price: 2.00, category: "Σνακ", stock: 25 },
		{ name: "Σάντουιτς Γαλοπούλα", price: 3.50, category: "Σνακ", stock: 15 },
		{ name: "Σάντουιτς Τυρί", price: 3.00, category: "Σνακ", stock: 15 },
		{ name: "Τοστ", price: 2.50, category: "Σνακ", stock: 20 },
		{ name: "Κέικ Σοκολάτα", price: 3.00, category: "Σνακ", stock: 10 },
		{ name: "Μπάρα Δημητριακών", price: 1.50, category: "Σνακ", stock: 30 },
		// Soft Drinks
		{ name: "Χυμός Πορτοκάλι", price: 3.00, category: "Αναψυκτικά", stock: 20 },
		{ name: "Χυμός Μήλο", price: 3.00, category: "Αναψυκτικά", stock: 20 },
		{ name: "Νερό 500ml", price: 0.50, category: "Αναψυκτικά", stock: 50 },
		{ name: "Νερό 1.5L", price: 1.00, category: "Αναψυκτικά", stock: 30 },
		{ name: "Coca-Cola", price: 2.00, category: "Αναψυκτικά", stock: 30 },
		{ name: "Sprite", price: 2.00, category: "Αναψυκτικά", stock: 30 },
		{ name: "Fanta", price: 2.00, category: "Αναψυκτικά", stock: 30 },
	],
	settings: {
		low_stock_threshold: 5,
		allow_unlimited_stock: true,
		negative_stock_allowed: false,
		coupons_value: 2.00,
		allow_treats: true,
		require_open_register_for_sale: true,
		currency_code: "EUR",
		tax_rate_percent: 24.00,
		tax_inclusive: true,
		booking_default_duration_min: 120,
		football_default_duration_min: 60,
		football_fields_count: 3,
		appointment_buffer_min: 15,
		prevent_overlaps: true,
		theme_default: "system",
		default_locale: "el",
		date_format: "DD/MM/YYYY",
		time_format: "24h",
		first_day_of_week: 1,
		business_hours: {
			mon: { open: "08:00", close: "22:00" },
			tue: { open: "08:00", close: "22:00" },
			wed: { open: "08:00", close: "22:00" },
			thu: { open: "08:00", close: "22:00" },
			fri: { open: "08:00", close: "23:00" },
			sat: { open: "09:00", close: "23:00" },
			sun: { open: "09:00", close: "21:00" },
		},
	},
};

// ============================================================================
// Utilities
// ============================================================================

const log = (message: string): boolean => process.stdout.write(`${message}\n`);
const logSuccess = (message: string): boolean => log(`✓ ${message}`);
const logError = (message: string): boolean => process.stderr.write(`✗ ${message}\n`);

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

function futureDate(days: number, hours = 0): Date {
	return new Date(Date.now() + days * DAY_MS + hours * HOUR_MS);
}

function randomItem<T>(arr: T[]): T {
	return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ============================================================================
// Database Operations
// ============================================================================

async function findOrCreateAuthUser(config: UserConfig): Promise<string> {
	// Check if user exists
	const { data: users } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
	const existing = users.users.find((u) => u.email?.toLowerCase() === config.email.toLowerCase());

	if (existing) {
		return existing.id;
	}

	// Create new user
	const { data, error } = await supabase.auth.admin.createUser({
		email: config.email,
		password: config.password,
		email_confirm: true,
		user_metadata: {
			username: config.username,
			full_name: config.fullName,
			role: config.role,
		},
	});

	if (error) throw new Error(`Failed to create auth user ${config.email}: ${error.message}`);
	return data.user.id;
}

async function ensurePublicUser(userId: string, config: UserConfig): Promise<void> {
	const { error } = await supabase.from("users").upsert({
		id: userId,
		username: config.username,
		email: config.email,
		full_name: config.fullName,
		role: config.role,
		is_active: true,
	}, { onConflict: "id" });

	if (error) throw new Error(`Failed to upsert user ${config.email}: ${error.message}`);
}

async function createTenant(): Promise<string> {
	const { data, error } = await supabase
		.from("tenants")
		.upsert({
			name: CONFIG.tenant.name,
			slug: CONFIG.tenant.slug,
			is_active: true,
		}, { onConflict: "slug" })
		.select("id")
		.single();

	if (error) throw new Error(`Failed to create tenant: ${error.message}`);
	return data.id;
}

async function createFacility(tenantId: string): Promise<string> {
	const { data: existing } = await supabase
		.from("facilities")
		.select("id")
		.eq("tenant_id", tenantId)
		.eq("name", CONFIG.facility.name)
		.maybeSingle();

	if (existing) return existing.id;

	const { data, error } = await supabase
		.from("facilities")
		.insert({
			tenant_id: tenantId,
			name: CONFIG.facility.name,
			address: CONFIG.facility.address,
			phone: CONFIG.facility.phone,
			email: CONFIG.facility.email,
			timezone: CONFIG.facility.timezone,
			is_active: true,
		})
		.select("id")
		.single();

	if (error) throw new Error(`Failed to create facility: ${error.message}`);
	return data.id;
}

async function assignMemberships(userId: string, tenantId: string, facilityId: string): Promise<void> {
	await Promise.all([
		supabase.from("tenant_members").upsert(
			{ tenant_id: tenantId, user_id: userId, is_default: true },
			{ onConflict: "tenant_id,user_id" }
		),
		supabase.from("facility_members").upsert(
			{ facility_id: facilityId, user_id: userId, is_default: true },
			{ onConflict: "facility_id,user_id" }
		),
	]);
}

async function createSettings(tenantId: string, facilityId: string): Promise<void> {
	// Tenant-wide settings
	await supabase.from("tenant_settings").upsert({
		tenant_id: tenantId,
		facility_id: null,
		...CONFIG.settings,
	}, { onConflict: "tenant_id" });

	// Facility-specific settings (inherits from tenant)
	const { data: existing } = await supabase
		.from("tenant_settings")
		.select("id")
		.eq("tenant_id", tenantId)
		.eq("facility_id", facilityId)
		.maybeSingle();

	if (!existing) {
		await supabase.from("tenant_settings").insert({
			tenant_id: tenantId,
			facility_id: facilityId,
			...CONFIG.settings,
		});
	}
}

async function createUserPreferences(userId: string): Promise<void> {
	await supabase.from("user_preferences").upsert({
		user_id: userId,
		theme: "system",
		locale: "el",
		collapsed_sidebar: false,
		dense_table_mode: false,
		email_notifications: true,
	}, { onConflict: "user_id" });
}

async function createCategories(ctx: Context): Promise<Map<string, CategoryData>> {
	const categoryMap = new Map<string, CategoryData>();

	// First pass: create root categories
	for (const cat of CONFIG.categories.filter((c) => !c.parent)) {
		const { data: existing } = await supabase
			.from("categories")
			.select("id, name")
			.eq("facility_id", ctx.facilityId)
			.ilike("name", cat.name)
			.maybeSingle();

		if (existing) {
			categoryMap.set(cat.name, existing);
			continue;
		}

		const { data, error } = await supabase
			.from("categories")
			.insert({
				tenant_id: ctx.tenantId,
				facility_id: ctx.facilityId,
				name: cat.name,
				description: cat.description,
				color: cat.color,
				icon: cat.icon,
				is_active: true,
				created_by: ctx.users.adminId,
			})
			.select("id, name")
			.single();

		if (error) throw new Error(`Failed to create category ${cat.name}: ${error.message}`);
		categoryMap.set(cat.name, data);
	}

	// Second pass: create child categories
	for (const cat of CONFIG.categories.filter((c) => c.parent)) {
		const parentName = cat.parent;
		if (!parentName) continue;
		const parent = categoryMap.get(parentName);
		if (!parent) continue;

		const { data: existing } = await supabase
			.from("categories")
			.select("id, name")
			.eq("facility_id", ctx.facilityId)
			.ilike("name", cat.name)
			.maybeSingle();

		if (existing) {
			categoryMap.set(cat.name, existing);
			continue;
		}

		const { data, error } = await supabase
			.from("categories")
			.insert({
				tenant_id: ctx.tenantId,
				facility_id: ctx.facilityId,
				parent_id: parent.id,
				name: cat.name,
				description: cat.description,
				color: cat.color,
				icon: cat.icon,
				is_active: true,
				created_by: ctx.users.adminId,
			})
			.select("id, name")
			.single();

		if (error) throw new Error(`Failed to create category ${cat.name}: ${error.message}`);
		categoryMap.set(cat.name, data);
	}

	return categoryMap;
}

async function createProducts(ctx: Context, categories: Map<string, CategoryData>): Promise<Map<string, ProductData>> {
	const productMap = new Map<string, ProductData>();

	for (const prod of CONFIG.products) {
		const { data: existing } = await supabase
			.from("products")
			.select("id, name, price")
			.eq("facility_id", ctx.facilityId)
			.ilike("name", prod.name)
			.maybeSingle();

		if (existing) {
			productMap.set(prod.name, existing);
			continue;
		}

		const category = categories.get(prod.category);
		const { data, error } = await supabase
			.from("products")
			.insert({
				tenant_id: ctx.tenantId,
				facility_id: ctx.facilityId,
				category_id: category?.id,
				name: prod.name,
				price: prod.price,
				stock_quantity: prod.stock,
				track_inventory: prod.stock !== -1,
				is_available: true,
				is_taxable: true,
				created_by: ctx.users.adminId,
			})
			.select("id, name, price")
			.single();

		if (error) throw new Error(`Failed to create product ${prod.name}: ${error.message}`);
		productMap.set(prod.name, data);
	}

	return productMap;
}

async function createRegisterSession(ctx: Context): Promise<string> {
	// Check for existing open session
	const { data: existing } = await supabase
		.from("register_sessions")
		.select("id")
		.eq("facility_id", ctx.facilityId)
		.is("closed_at", null)
		.maybeSingle();

	if (existing) return existing.id;

	const { data, error } = await supabase
		.from("register_sessions")
		.insert({
			tenant_id: ctx.tenantId,
			facility_id: ctx.facilityId,
			opened_by: ctx.users.staffId,
			opening_cash: 100.00,
		})
		.select("id")
		.single();

	if (error) throw new Error(`Failed to create register session: ${error.message}`);
	return data.id;
}

async function createSampleOrders(ctx: Context, sessionId: string, products: Map<string, ProductData>): Promise<void> {
	const productList = Array.from(products.values());
	const orderCount = 5;

	for (let i = 0; i < orderCount; i++) {
		// Random items for this order
		const itemCount = randomInt(1, 4);
		const orderProducts = Array.from({ length: itemCount }, () => randomItem(productList));
		const hasTreat = Math.random() > 0.7;
		const couponCount = Math.random() > 0.8 ? randomInt(1, 3) : 0;

		let subtotal = 0;
		const items = orderProducts.map((p, idx) => {
			const quantity = randomInt(1, 2);
			const isTreat = hasTreat && idx === 0;
			const lineTotal = isTreat ? 0 : p.price * quantity;
			subtotal += p.price * quantity;

			return {
				product_id: p.id,
				product_name: p.name,
				quantity,
				unit_price: p.price,
				line_total: lineTotal,
				is_treat: isTreat,
			};
		});

		const discountAmount = hasTreat ? orderProducts[0].price : 0;
		const couponDiscount = couponCount * CONFIG.settings.coupons_value;
		const totalDiscount = discountAmount + couponDiscount;
		const totalAmount = Math.max(0, subtotal - totalDiscount);

		// Create order
		const { data: order, error: orderError } = await supabase
			.from("orders")
			.insert({
				tenant_id: ctx.tenantId,
				facility_id: ctx.facilityId,
				session_id: sessionId,
				status: "completed",
				payment_method: randomItem(["cash", "card", "cash", "cash"]),
				subtotal,
				discount_amount: totalDiscount,
				total_amount: totalAmount,
				coupon_count: couponCount,
				created_by: ctx.users.staffId,
			})
			.select("id")
			.single();

		if (orderError) throw new Error(`Failed to create order: ${orderError.message}`);

		// Create order items
		const orderItems = items.map((item) => ({ ...item, order_id: order.id }));
		const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
		if (itemsError) throw new Error(`Failed to create order items: ${itemsError.message}`);
	}
}

async function createAppointments(ctx: Context): Promise<void> {
	const appointments = [
		{
			customer_name: "Μαρία Παπαδοπούλου",
			contact_info: "6912345678",
			appointment_date: futureDate(2, 15),
			num_children: 8,
			num_adults: 4,
			package_type: "Premium",
			total_price: 250.00,
			notes: "Γενέθλια 7 χρονών - θέμα πριγκίπισσες",
		},
		{
			customer_name: "Γιώργος Δημητρίου",
			contact_info: "6923456789",
			appointment_date: futureDate(3, 11),
			num_children: 12,
			num_adults: 6,
			package_type: "Standard",
			total_price: 180.00,
			notes: "Σχολική εκδρομή νηπιαγωγείου",
		},
		{
			customer_name: "Ελένη Κωνσταντίνου",
			contact_info: "6934567890",
			appointment_date: futureDate(5, 16),
			num_children: 6,
			num_adults: 3,
			package_type: "Basic",
			total_price: 120.00,
			notes: "Γενέθλια 5 χρονών",
		},
		{
			customer_name: "Νίκος Αλεξίου",
			contact_info: "6945678901",
			appointment_date: futureDate(7, 14),
			num_children: 10,
			num_adults: 5,
			package_type: "Premium",
			total_price: 280.00,
			deposit_amount: 50.00,
			deposit_paid: true,
			notes: "Γενέθλια διδύμων - θέμα σούπερ ήρωες",
		},
		{
			customer_name: "Σοφία Παπανικολάου",
			contact_info: "6956789012",
			appointment_date: futureDate(10, 17),
			num_children: 15,
			num_adults: 8,
			package_type: "Deluxe",
			total_price: 350.00,
			deposit_amount: 100.00,
			deposit_paid: true,
			notes: "Μεγάλο πάρτι - απαιτείται επιπλέον προσωπικό",
			internal_notes: "VIP πελάτης - επανειλημμένες κρατήσεις",
		},
	];

	for (const apt of appointments) {
		const { data: existing } = await supabase
			.from("appointments")
			.select("id")
			.eq("facility_id", ctx.facilityId)
			.eq("customer_name", apt.customer_name)
			.gte("appointment_date", new Date().toISOString())
			.maybeSingle();

		if (existing) continue;

		const { error } = await supabase.from("appointments").insert({
			tenant_id: ctx.tenantId,
			facility_id: ctx.facilityId,
			created_by: ctx.users.secretaryId,
			status: "confirmed",
			duration_minutes: 120,
			...apt,
		});

		if (error) throw new Error(`Failed to create appointment: ${error.message}`);
	}
}

async function createFootballBookings(ctx: Context): Promise<void> {
	const bookings = [
		{
			customer_name: "Αθλητικός Σύλλογος Παναθηναϊκός",
			contact_info: "6912111111",
			booking_datetime: futureDate(1, 18),
			field_number: 1,
			num_players: 10,
			is_recurring: true,
			recurring_pattern: "weekly",
			notes: "Εβδομαδιαία προπόνηση",
		},
		{
			customer_name: "Κώστας Νικολάου",
			contact_info: "6923222222",
			booking_datetime: futureDate(1, 20),
			field_number: 2,
			num_players: 12,
			total_price: 80.00,
			notes: "Φιλικό παιχνίδι μεταξύ φίλων",
		},
		{
			customer_name: "Εταιρεία TechCorp",
			contact_info: "6934333333",
			booking_datetime: futureDate(2, 19),
			field_number: 1,
			num_players: 14,
			total_price: 100.00,
			notes: "Εταιρικό event - team building",
			internal_notes: "Εταιρικός πελάτης - τιμολόγιο",
		},
		{
			customer_name: "Δημήτρης Παπάς",
			contact_info: "6945444444",
			booking_datetime: futureDate(3, 17),
			field_number: 3,
			num_players: 8,
			total_price: 60.00,
			notes: "5x5 παιχνίδι",
		},
		{
			customer_name: "Γυμναστήριο FitLife",
			contact_info: "6956555555",
			booking_datetime: futureDate(4, 10),
			field_number: 2,
			num_players: 16,
			total_price: 120.00,
			deposit_amount: 30.00,
			deposit_paid: true,
			notes: "Τουρνουά μελών γυμναστηρίου",
		},
		{
			customer_name: "Ανδρέας Γεωργίου",
			contact_info: "6967666666",
			booking_datetime: futureDate(5, 21),
			field_number: 1,
			num_players: 10,
			total_price: 80.00,
			notes: "Bachelor party game",
		},
	];

	for (const booking of bookings) {
		const { data: existing } = await supabase
			.from("football_bookings")
			.select("id")
			.eq("facility_id", ctx.facilityId)
			.eq("field_number", booking.field_number)
			.eq("booking_datetime", booking.booking_datetime.toISOString())
			.maybeSingle();

		if (existing) continue;

		const { error } = await supabase.from("football_bookings").insert({
			tenant_id: ctx.tenantId,
			facility_id: ctx.facilityId,
			created_by: ctx.users.secretaryId,
			status: "confirmed",
			duration_minutes: 60,
			...booking,
		});

		if (error) throw new Error(`Failed to create football booking: ${error.message}`);
	}
}

// ============================================================================
// Main Seeding Function
// ============================================================================

async function seed(): Promise<void> {
	log("🚀 Starting ClubOS database seeding...\n");

	try {
		// Step 1: Create tenant and facility
		log("📦 Setting up organization...");
		const tenantId = await createTenant();
		const facilityId = await createFacility(tenantId);
		logSuccess(`Tenant: ${CONFIG.tenant.name}`);
		logSuccess(`Facility: ${CONFIG.facility.name}`);

		// Step 2: Create users
		log("\n👥 Creating users...");
		const adminId = await findOrCreateAuthUser(CONFIG.users.admin);
		await ensurePublicUser(adminId, CONFIG.users.admin);
		await assignMemberships(adminId, tenantId, facilityId);
		await createUserPreferences(adminId);
		logSuccess(`Admin: ${CONFIG.users.admin.email}`);

		const secretaryId = await findOrCreateAuthUser(CONFIG.users.secretary);
		await ensurePublicUser(secretaryId, CONFIG.users.secretary);
		await assignMemberships(secretaryId, tenantId, facilityId);
		await createUserPreferences(secretaryId);
		logSuccess(`Secretary: ${CONFIG.users.secretary.email}`);

		const staffId = await findOrCreateAuthUser(CONFIG.users.staff);
		await ensurePublicUser(staffId, CONFIG.users.staff);
		await assignMemberships(staffId, tenantId, facilityId);
		await createUserPreferences(staffId);
		logSuccess(`Staff: ${CONFIG.users.staff.email}`);

		const ctx: Context = {
			supabase,
			tenantId,
			facilityId,
			users: { adminId, secretaryId, staffId },
		};

		// Step 3: Create settings
		log("\n⚙️  Configuring settings...");
		await createSettings(tenantId, facilityId);
		logSuccess("Tenant and facility settings configured");

		// Step 4: Create categories
		log("\n📁 Creating categories...");
		const categories = await createCategories(ctx);
		logSuccess(`Created ${categories.size} categories`);

		// Step 5: Create products
		log("\n🛍️  Creating products...");
		const products = await createProducts(ctx, categories);
		logSuccess(`Created ${products.size} products`);

		// Step 6: Create register session and orders
		log("\n💰 Creating POS data...");
		const sessionId = await createRegisterSession(ctx);
		await createSampleOrders(ctx, sessionId, products);
		logSuccess("Created register session and sample orders");

		// Step 7: Create appointments
		log("\n🎂 Creating birthday appointments...");
		await createAppointments(ctx);
		logSuccess("Created sample appointments");

		// Step 8: Create football bookings
		log("\n⚽ Creating football bookings...");
		await createFootballBookings(ctx);
		logSuccess("Created sample football bookings");

		log("\n✅ Database seeding completed successfully!\n");
		log("Demo credentials:");
		log(`  Admin:     ${CONFIG.users.admin.email} / ${CONFIG.users.admin.password}`);
		log(`  Secretary: ${CONFIG.users.secretary.email} / ${CONFIG.users.secretary.password}`);
		log(`  Staff:     ${CONFIG.users.staff.email} / ${CONFIG.users.staff.password}`);
		log("");
	} catch (error) {
		logError(`Seeding failed: ${error}`);
		process.exit(1);
	}
}

// Run seeder
seed();
