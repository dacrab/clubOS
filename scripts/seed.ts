import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

type Category = { id: string; name: string };
type Product = { id: string; name: string; price: number };
type RegisterSession = { id: string };

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!(supabaseUrl && supabaseServiceKey)) {
	throw new Error(
		"Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env",
	);
}

// Use service role key to bypass RLS for seeding
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
	auth: {
		autoRefreshToken: false,
		persistSession: false,
	},
});

// Hardcoded user configuration
const CONFIG = {
	tenantName: "Demo Club",
	admin: {
		email: "admin@example.com",
		password: "admin123",
		username: "Admin User",
	},
	staff: {
		email: "staff@example.com",
		password: "staff123",
	},
	secretary: {
		email: "secretary@example.com",
		password: "secretary123",
	},
};

// Removed Edge Function dependencies - using direct database operations instead

async function signInOrSignUpAdmin(): Promise<{ userId: string }> {
	// Check if admin user already exists
	const { data: existingUser } = await supabase.auth.admin.listUsers({
		page: 1,
		perPage: 1000,
	});

	const adminUser = existingUser.users.find(
		(user) => user.email === CONFIG.admin.email,
	);

	if (adminUser) {
		process.stdout.write(`Admin user already exists: ${CONFIG.admin.email}\n`);
		return { userId: adminUser.id };
	}

	// Create admin user
	const { data: signUpData, error: signUpErr } =
		await supabase.auth.admin.createUser({
			email: CONFIG.admin.email,
			password: CONFIG.admin.password,
			user_metadata: { role: "admin", username: CONFIG.admin.username },
			email_confirm: true,
		});

	if (signUpErr) {
		throw new Error(`Admin creation failed: ${signUpErr.message}`);
	}

	const createdId = signUpData.user?.id;
	if (!createdId) {
		throw new Error("Admin creation did not return a user id");
	}

	process.stdout.write(`Created admin user: ${CONFIG.admin.email}\n`);
	return { userId: createdId };
}

async function ensureUserByUsername(username: string): Promise<string | null> {
	const { data } = await supabase
		.from("users")
		.select("id")
		.ilike("username", username)
		.limit(1)
		.maybeSingle();

	return data?.id ?? null;
}

type CreateUserOptions = {
	email: string;
	password: string;
	role: "admin" | "staff" | "secretary";
	username: string;
	facilityId?: string;
};

async function createUserViaFunction(opts: CreateUserOptions): Promise<string> {
	const { email, password, role, username, facilityId } = opts;

	const existingId = await ensureUserByUsername(username);
	if (existingId) {
		process.stdout.write(`User ${username} already exists\n`);
		return existingId;
	}

	// Create user via Supabase Auth Admin API
	const { data: signUpData, error: signUpError } =
		await supabase.auth.admin.createUser({
			email,
			password,
			user_metadata: { role, username },
			email_confirm: true,
		});

	if (signUpError) {
		throw new Error(`User creation failed: ${signUpError.message}`);
	}

	const userId = signUpData.user?.id;
	if (!userId) {
		throw new Error("User creation did not return a user id");
	}

	// Add user to tenant (required for all users)
	const { data: tenantData } = await supabase
		.from("tenants")
		.select("id")
		.eq("name", CONFIG.tenantName)
		.limit(1)
		.maybeSingle();

	if (tenantData?.id) {
		const { error: tenantError } = await supabase
			.from("tenant_members")
			.insert({ tenant_id: tenantData.id, user_id: userId });

		if (tenantError) {
			process.stderr.write(
				`WARN: Failed to add user to tenant: ${tenantError.message}\n`,
			);
		}
	}

	// Add user to facility if specified
	if (facilityId) {
		const { error: facilityError } = await supabase
			.from("facility_members")
			.insert({ facility_id: facilityId, user_id: userId });

		if (facilityError) {
			process.stderr.write(
				`WARN: Failed to add user to facility: ${facilityError.message}\n`,
			);
		}
	}

	process.stdout.write(`Created user: ${username}\n`);
	return userId;
}

async function ensureTenantAndFacility(): Promise<{
	tenantId: string;
	facilityId: string;
}> {
	// Check if tenant already exists
	const { data: existingTenant } = await supabase
		.from("tenants")
		.select("id")
		.eq("name", CONFIG.tenantName)
		.limit(1)
		.maybeSingle();

	let tenantId: string;
	if (existingTenant?.id) {
		tenantId = existingTenant.id;
		process.stdout.write(`Using existing tenant: ${CONFIG.tenantName}\n`);
	} else {
		// Create new tenant
		const { data: newTenant, error: tenantError } = await supabase
			.from("tenants")
			.insert({ name: CONFIG.tenantName })
			.select("id")
			.single();

		if (tenantError) {
			throw new Error(`Failed to create tenant: ${tenantError.message}`);
		}
		tenantId = newTenant.id;
		process.stdout.write(`Created tenant: ${CONFIG.tenantName}\n`);
	}

	// Check if facility already exists
	const { data: existingFacility } = await supabase
		.from("facilities")
		.select("id")
		.eq("tenant_id", tenantId)
		.eq("name", "Main Facility")
		.limit(1)
		.maybeSingle();

	let facilityId: string;
	if (existingFacility?.id) {
		facilityId = existingFacility.id;
		process.stdout.write("Using existing facility: Main Facility\n");
	} else {
		// Create new facility
		const { data: newFacility, error: facilityError } = await supabase
			.from("facilities")
			.insert({
				tenant_id: tenantId,
				name: "Main Facility",
			})
			.select("id")
			.single();

		if (facilityError) {
			throw new Error(`Failed to create facility: ${facilityError.message}`);
		}
		facilityId = newFacility.id;
		process.stdout.write("Created facility: Main Facility\n");
	}

	return { tenantId, facilityId };
}

async function ensureTenantSettings(
	tenantId: string,
	facilityId: string,
): Promise<string> {
	const { data: existing } = await supabase
		.from("tenant_settings")
		.select("id")
		.eq("tenant_id", tenantId)
		.eq("facility_id", facilityId)
		.limit(1)
		.maybeSingle();

	if (existing?.id) {
		return existing.id;
	}

	const { data, error } = await supabase
		.from("tenant_settings")
		.upsert(
			{
				tenant_id: tenantId,
				facility_id: facilityId,
			},
			{ onConflict: "tenant_id,facility_id" },
		)
		.select("id")
		.single();

	if (error) {
		throw new Error(`Failed to ensure tenant settings: ${error.message}`);
	}

	return data.id;
}

async function ensureUserPreferences(userId: string) {
	await supabase
		.from("user_preferences")
		.upsert({ user_id: userId }, { onConflict: "user_id" })
		.select("user_id")
		.maybeSingle();
}

async function seedCategories(
	adminId: string,
	tenantId: string,
	facilityId: string,
): Promise<Category[]> {
	async function ensureCategory(
		name: string,
		description: string,
		parentId?: string,
	): Promise<Category> {
		const { data: existing } = await supabase
			.from("categories")
			.select("id, name")
			.eq("tenant_id", tenantId)
			.eq("facility_id", facilityId)
			.ilike("name", name)
			.limit(1)
			.maybeSingle();

		if (existing?.id) {
			return existing as Category;
		}

		const { data, error } = await supabase
			.from("categories")
			.insert({
				name,
				description,
				parent_id: parentId,
				created_by: adminId,
				tenant_id: tenantId,
				facility_id: facilityId,
			})
			.select("id,name")
			.single();

		if (error) {
			throw new Error(`Failed to ensure category ${name}: ${error.message}`);
		}

		return data as Category;
	}

	const rootCategory = await ensureCategory("Καφέδες", "Όλα τα είδη καφέ");

	await Promise.all([
		ensureCategory("Ζεστοί Καφέδες", "Ζεστοί καφέδες", rootCategory.id),
		ensureCategory("Κρύοι Καφέδες", "Κρύοι καφέδες", rootCategory.id),
		ensureCategory("Ροφήματα", "Διάφορα ροφήματα"),
		ensureCategory("Σνακ", "Διάφορα σνακ"),
	]);

	const { data: rows, error: fetchErr } = await supabase
		.from("categories")
		.select("id,name")
		.eq("tenant_id", tenantId)
		.eq("facility_id", facilityId);

	if (fetchErr) {
		throw new Error(`Failed to fetch categories: ${fetchErr.message}`);
	}

	process.stdout.write("Ensured categories\n");
	return (rows ?? []).map(({ id, name }) => ({ id, name }));
}

async function seedProducts(
	categories: Category[],
	adminId: string,
	tenantId: string,
	facilityId: string,
): Promise<Product[]> {
	const categoryMap = {
		hotCoffee: categories.find((c) => c.name === "Ζεστοί Καφέδες"),
		coldCoffee: categories.find((c) => c.name === "Κρύοι Καφέδες"),
		beverage: categories.find((c) => c.name === "Ροφήματα"),
		snack: categories.find((c) => c.name === "Σνακ"),
	};

	const productData = [
		// Hot Coffees
		{ name: "Espresso", price: 2.0, category: categoryMap.hotCoffee },
		{ name: "Cappuccino", price: 3.0, category: categoryMap.hotCoffee },
		{ name: "Latte", price: 3.5, category: categoryMap.hotCoffee },

		// Cold Coffees
		{ name: "Freddo Espresso", price: 3.0, category: categoryMap.coldCoffee },
		{ name: "Freddo Cappuccino", price: 3.5, category: categoryMap.coldCoffee },
		{ name: "Iced Latte", price: 4.0, category: categoryMap.coldCoffee },

		// Beverages
		{ name: "Σοκολάτα", price: 3.5, category: categoryMap.beverage },
		{ name: "Τσάι", price: 2.5, category: categoryMap.beverage },
		{ name: "Χυμός Πορτοκάλι", price: 3.0, category: categoryMap.beverage },

		// Snacks
		{ name: "Κρουασάν", price: 2.0, category: categoryMap.snack, stock: 20 },
		{ name: "Σάντουιτς", price: 3.5, category: categoryMap.snack, stock: 15 },
		{ name: "Τοστ", price: 2.5, category: categoryMap.snack, stock: 25 },
	];

	const ensured: Product[] = [];

	for (const p of productData) {
		const { data: existing } = await supabase
			.from("products")
			.select("id,name,price")
			.eq("tenant_id", tenantId)
			.eq("facility_id", facilityId)
			.ilike("name", p.name)
			.limit(1)
			.maybeSingle();

		if (existing?.id) {
			ensured.push(existing as Product);
			continue;
		}

		const { data: created, error } = await supabase
			.from("products")
			.insert({
				name: p.name,
				price: p.price,
				stock_quantity: p.stock ?? -1,
				category_id: p.category?.id,
				created_by: adminId,
				tenant_id: tenantId,
				facility_id: facilityId,
			})
			.select("id,name,price")
			.single();

		if (error) {
			throw new Error(`Failed to ensure product ${p.name}: ${error.message}`);
		}

		ensured.push(created as Product);
	}

	process.stdout.write("Ensured products\n");
	return ensured.map(({ id, name, price }) => ({ id, name, price }));
}

async function seedRegisterSession(
	adminId: string,
	tenantId: string,
	facilityId: string,
): Promise<RegisterSession> {
	const { data: existing } = await supabase
		.from("register_sessions")
		.select("id")
		.eq("tenant_id", tenantId)
		.eq("facility_id", facilityId)
		.is("closed_at", null)
		.limit(1)
		.maybeSingle();

	if (existing?.id) {
		process.stdout.write("Reusing open register session\n");
		return { id: existing.id };
	}

	const { data, error } = await supabase
		.from("register_sessions")
		.insert({
			opened_by: adminId,
			tenant_id: tenantId,
			facility_id: facilityId,
		})
		.select("id")
		.single();

	if (error) {
		throw new Error(`Failed to create register session: ${error.message}`);
	}

	process.stdout.write("Created register session\n");
	return { id: data.id };
}

type SeedOrderOptions = {
	session: RegisterSession;
	products: Product[];
	staffId: string;
	tenantId: string;
	facilityId: string;
};

async function seedOrders(opts: SeedOrderOptions) {
	const { session, products, staffId, tenantId, facilityId } = opts;

	const productMap = {
		espresso: products.find((p) => p.name === "Espresso"),
		chocolate: products.find((p) => p.name === "Σοκολάτα"),
		croissant: products.find((p) => p.name === "Κρουασάν"),
	};

	if (!(productMap.espresso && productMap.chocolate && productMap.croissant)) {
		throw new Error("Required products missing for order items");
	}

	// Check if order already exists
	const { data: existingOrder } = await supabase
		.from("orders")
		.select("id")
		.eq("session_id", session.id)
		.limit(1)
		.maybeSingle();

	if (existingOrder?.id) {
		process.stdout.write("Sample order already exists — skipping\n");
		return;
	}

	// Calculate order totals
	const prices = {
		espresso: Number(productMap.espresso.price),
		chocolate: Number(productMap.chocolate.price),
		croissant: Number(productMap.croissant.price),
	};

	const subtotal = prices.espresso + prices.chocolate + prices.croissant;
	const treatDiscount = prices.espresso; // espresso is treated
	const discountAmount = treatDiscount;
	const totalAmount = subtotal - discountAmount;

	// Create order
	const { data: order, error: orderError } = await supabase
		.from("orders")
		.insert({
			session_id: session.id,
			subtotal,
			discount_amount: discountAmount,
			total_amount: totalAmount,
			coupon_count: 0,
			created_by: staffId,
			tenant_id: tenantId,
			facility_id: facilityId,
		})
		.select("id")
		.single();

	if (orderError) {
		throw new Error(`Failed to create order: ${orderError.message}`);
	}

	// Create order items
	const orderItems = [
		{
			order_id: order.id,
			product_id: productMap.espresso.id,
			quantity: 1,
			unit_price: prices.espresso,
			line_total: 0,
			is_treat: true,
		},
		{
			order_id: order.id,
			product_id: productMap.chocolate.id,
			quantity: 1,
			unit_price: prices.chocolate,
			line_total: prices.chocolate,
			is_treat: false,
		},
		{
			order_id: order.id,
			product_id: productMap.croissant.id,
			quantity: 1,
			unit_price: prices.croissant,
			line_total: prices.croissant,
			is_treat: false,
		},
	];

	const { error: itemsError } = await supabase
		.from("order_items")
		.insert(orderItems);

	if (itemsError) {
		throw new Error(`Failed to create order items: ${itemsError.message}`);
	}

	process.stdout.write("Created sample order\n");
}

const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const DAYS_AHEAD_FOR_APPOINTMENT = 3;
const DAY_MS =
	HOURS_PER_DAY *
	MINUTES_PER_HOUR *
	SECONDS_PER_MINUTE *
	MILLISECONDS_PER_SECOND;

async function seedAppointments(
	staffId: string,
	tenantId: string,
	facilityId: string,
) {
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
			appointment_date: new Date(
				Date.now() + DAYS_AHEAD_FOR_APPOINTMENT * DAY_MS,
			),
			num_children: 5,
			num_adults: 3,
			notes: "Σχολική εκδρομή",
		},
	];

	for (const appointment of appointments) {
		const { data: existing } = await supabase
			.from("appointments")
			.select("id")
			.eq("tenant_id", tenantId)
			.eq("facility_id", facilityId)
			.eq("appointment_date", appointment.appointment_date.toISOString())
			.ilike("customer_name", appointment.customer_name)
			.limit(1)
			.maybeSingle();

		if (existing?.id) {
			continue;
		}

		const { error } = await supabase.from("appointments").insert({
			...appointment,
			created_by: staffId,
			tenant_id: tenantId,
			facility_id: facilityId,
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
	tenantId: string,
	facilityId: string,
) {
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
			.eq("tenant_id", tenantId)
			.eq("facility_id", facilityId)
			.eq("booking_datetime", booking.booking_datetime.toISOString())
			.eq("field_number", booking.field_number)
			.limit(1)
			.maybeSingle();

		if (existing?.id) {
			continue;
		}

		const { error } = await supabase.from("football_bookings").insert({
			...booking,
			created_by: staffId,
			tenant_id: tenantId,
			facility_id: facilityId,
		});

		if (error) {
			throw new Error(
				`Failed to create football booking for field ${booking.field_number}: ${error.message}`,
			);
		}
	}

	process.stdout.write("Ensured football bookings\n");
}

async function main() {
	try {
		process.stdout.write("Starting database seeding...\n");

		// Ensure tenant + facility first
		const { tenantId, facilityId } = await ensureTenantAndFacility();

		// Authenticate admin
		const { userId: adminId } = await signInOrSignUpAdmin();

		// Ensure admin is added to tenant
		const { error: adminTenantError } = await supabase
			.from("tenant_members")
			.upsert(
				{ tenant_id: tenantId, user_id: adminId },
				{ onConflict: "tenant_id,user_id" },
			);

		if (adminTenantError) {
			process.stderr.write(
				`WARN: Failed to add admin to tenant: ${adminTenantError.message}\n`,
			);
		}

		// Ensure admin is added to facility
		const { error: adminFacilityError } = await supabase
			.from("facility_members")
			.upsert(
				{ facility_id: facilityId, user_id: adminId },
				{ onConflict: "facility_id,user_id" },
			);

		if (adminFacilityError) {
			process.stderr.write(
				`WARN: Failed to add admin to facility: ${adminFacilityError.message}\n`,
			);
		}

		// Create additional users
		const staffId = await createUserViaFunction({
			email: CONFIG.staff.email,
			password: CONFIG.staff.password,
			role: "staff",
			username: "Staff User",
			facilityId,
		});

		const secretaryId = await createUserViaFunction({
			email: CONFIG.secretary.email,
			password: CONFIG.secretary.password,
			role: "secretary",
			username: "Secretary User",
			facilityId,
		});

		// Ensure settings and preferences
		await ensureTenantSettings(tenantId, facilityId);
		await Promise.all([
			ensureUserPreferences(adminId),
			ensureUserPreferences(staffId),
			ensureUserPreferences(secretaryId),
		]);

		// Seed data
		const categories = await seedCategories(adminId, tenantId, facilityId);
		const products = await seedProducts(
			categories,
			adminId,
			tenantId,
			facilityId,
		);
		const session = await seedRegisterSession(adminId, tenantId, facilityId);

		await Promise.all([
			seedOrders({ session, products, staffId, tenantId, facilityId }),
			seedAppointments(staffId, tenantId, facilityId),
			seedFootballBookings(staffId, tenantId, facilityId),
		]);

		process.stdout.write("Database seeding completed successfully!\n");
	} catch (error) {
		process.stderr.write(`ERROR: Seeding failed: ${String(error)}\n`);
		process.exit(1);
	}
}

main();
