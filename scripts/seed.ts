import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

type Category = { id: string; name: string };
type Product = { id: string; name: string; price: number };
type RegisterSession = { id: string };
type Facility = { id: string };
type TenantSettings = { id: string };

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SEED_TENANT_NAME = process.env.SEED_TENANT_NAME || "Demo Club";
const SEED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@example.com";
const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "admin123";
const SEED_STAFF_EMAIL = process.env.SEED_STAFF_EMAIL || "staff@example.com";
const SEED_STAFF_PASSWORD = process.env.SEED_STAFF_PASSWORD || "staff123";
const SEED_SECRETARY_EMAIL = process.env.SEED_SECRETARY_EMAIL || "secretary@example.com";
const SEED_SECRETARY_PASSWORD = process.env.SEED_SECRETARY_PASSWORD || "secretary123";

if (!(supabaseUrl && supabaseServiceKey)) {
  throw new Error("Supabase URL or service key not found");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createUser(
  email: string,
  password: string,
  role: "admin" | "staff" | "secretary",
  username: string
) {
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const userExists = existingUsers.users.some((u) => u.email === email);

  if (userExists) {
    console.log(`User ${email} already exists`);
    return existingUsers.users.find((u) => u.email === email);
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role, username },
  });

  if (error) {
    throw new Error(`Failed to create user ${email}: ${error.message}`);
  }

  console.log(`Created user: ${email}`);
  return user;
}

async function ensureTenant(name: string): Promise<string> {
  const { data: existing } = await supabase
    .from("tenants")
    .select("id")
    .eq("name", name)
    .limit(1)
    .maybeSingle();
  if (existing?.id) {
    return existing.id as string;
  }
  const { data, error } = await supabase
    .from("tenants")
    .insert({ name })
    .select("id")
    .single();
  if (error) {
    throw new Error(`Failed to create tenant: ${error.message}`);
  }
  return (data as { id: string }).id;
}

async function addMember(tenantId: string, userId: string) {
  await supabase
    .from("tenant_members")
    .upsert(
      { tenant_id: tenantId, user_id: userId },
      { onConflict: "tenant_id,user_id" }
    )
    .select()
    .maybeSingle();
}

async function ensureFacility(tenantId: string): Promise<string> {
  const { data: fac } = await supabase
    .from("facilities")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .order("name")
    .limit(1)
    .maybeSingle();
  if (fac?.id) {
    return fac.id as string;
  }
  const { data, error } = await supabase
    .from("facilities")
    .insert({ tenant_id: tenantId, name: "Main Facility" })
    .select("id")
    .single();
  if (error) {
    throw new Error(`Failed to create facility: ${error.message}`);
  }
  return (data as Facility).id;
}

async function addFacilityMember(facilityId: string, userId: string) {
  await supabase
    .from("facility_members")
    .upsert(
      { facility_id: facilityId, user_id: userId },
      {
        onConflict: "facility_id,user_id",
      }
    )
    .select()
    .maybeSingle();
}

async function ensureTenantSettings(
  tenantId: string,
  facilityId: string
): Promise<string> {
  const { data: existing } = await supabase
    .from("tenant_settings")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("facility_id", facilityId)
    .limit(1)
    .maybeSingle();
  if (existing?.id) return (existing as { id: string }).id;

  const { data, error } = await supabase
    .from("tenant_settings")
    .upsert(
      {
        tenant_id: tenantId,
        facility_id: facilityId,
      },
      { onConflict: "tenant_id,facility_id" }
    )
    .select("id")
    .single();
  if (error) throw new Error(`Failed to ensure tenant settings: ${error.message}`);
  return (data as TenantSettings).id;
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
  facilityId: string
) {
  async function ensureCategory(name: string, description: string, parentId?: string) {
    const { data: existing } = await supabase
      .from("categories")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .eq("facility_id", facilityId)
      .ilike("name", name)
      .limit(1)
      .maybeSingle();

    if (existing?.id) return existing as Category;

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
    if (error) throw new Error(`Failed to ensure category ${name}: ${error.message}`);
    return data as Category;
  }

  const main = await ensureCategory("Καφέδες", "Όλα τα είδη καφέ");
  await Promise.all([
    ensureCategory("Ζεστοί Καφέδες", "Ζεστοί καφέδες", main.id),
    ensureCategory("Κρύοι Καφέδες", "Κρύοι καφέδες", main.id),
    ensureCategory("Ροφήματα", "Διάφορα ροφήματα"),
    ensureCategory("Σνακ", "Διάφορα σνακ"),
  ]);

  const { data: rows, error: fetchErr } = await supabase
    .from("categories")
    .select("id,name")
    .eq("tenant_id", tenantId)
    .eq("facility_id", facilityId);
  if (fetchErr) throw new Error(`Failed to fetch categories: ${fetchErr.message}`);
  console.log("Ensured categories");
  return (rows ?? []).map(({ id, name }) => ({ id, name }));
}

async function seedProducts(
  categories: Category[],
  adminId: string,
  tenantId: string,
  facilityId: string
) {
  const hotCoffeeCategory = categories.find((c) => c.name === "Ζεστοί Καφέδες");
  const coldCoffeeCategory = categories.find((c) => c.name === "Κρύοι Καφέδες");
  const beverageCategory = categories.find((c) => c.name === "Ροφήματα");
  const snackCategory = categories.find((c) => c.name === "Σνακ");

  const products = [
    // Hot Coffees
    {
      name: "Espresso",
      price: 2.0,
      stock_quantity: -1,
      category_id: hotCoffeeCategory?.id,
      created_by: adminId,
      tenant_id: tenantId,
      facility_id: facilityId,
    },
    {
      name: "Cappuccino",
      price: 3.0,
      stock_quantity: -1,
      category_id: hotCoffeeCategory?.id,
      created_by: adminId,
      tenant_id: tenantId,
      facility_id: facilityId,
    },
    {
      name: "Latte",
      price: 3.5,
      stock_quantity: -1,
      category_id: hotCoffeeCategory?.id,
      created_by: adminId,
      tenant_id: tenantId,
      facility_id: facilityId,
    },

    // Cold Coffees
    {
      name: "Freddo Espresso",
      price: 3.0,
      stock_quantity: -1,
      category_id: coldCoffeeCategory?.id,
      created_by: adminId,
      tenant_id: tenantId,
      facility_id: facilityId,
    },
    {
      name: "Freddo Cappuccino",
      price: 3.5,
      stock_quantity: -1,
      category_id: coldCoffeeCategory?.id,
      created_by: adminId,
      tenant_id: tenantId,
      facility_id: facilityId,
    },
    {
      name: "Iced Latte",
      price: 4.0,
      stock_quantity: -1,
      category_id: coldCoffeeCategory?.id,
      created_by: adminId,
      tenant_id: tenantId,
      facility_id: facilityId,
    },

    // Beverages
    {
      name: "Σοκολάτα",
      price: 3.5,
      stock_quantity: -1,
      category_id: beverageCategory?.id,
      created_by: adminId,
      tenant_id: tenantId,
      facility_id: facilityId,
    },
    {
      name: "Τσάι",
      price: 2.5,
      stock_quantity: -1,
      category_id: beverageCategory?.id,
      created_by: adminId,
      tenant_id: tenantId,
      facility_id: facilityId,
    },
    {
      name: "Χυμός Πορτοκάλι",
      price: 3.0,
      stock_quantity: -1,
      category_id: beverageCategory?.id,
      created_by: adminId,
      tenant_id: tenantId,
      facility_id: facilityId,
    },

    // Snacks
    {
      name: "Κρουασάν",
      price: 2.0,
      stock_quantity: 20,
      category_id: snackCategory?.id,
      created_by: adminId,
      tenant_id: tenantId,
      facility_id: facilityId,
    },
    {
      name: "Σάντουιτς",
      price: 3.5,
      stock_quantity: 15,
      category_id: snackCategory?.id,
      created_by: adminId,
      tenant_id: tenantId,
      facility_id: facilityId,
    },
    {
      name: "Τοστ",
      price: 2.5,
      stock_quantity: 25,
      category_id: snackCategory?.id,
      created_by: adminId,
      tenant_id: tenantId,
      facility_id: facilityId,
    },
  ];

  const ensured: Product[] = [];
  for (const p of products) {
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
      .insert(p)
      .select("id,name,price")
      .single();
    if (error) throw new Error(`Failed to ensure product ${p.name}: ${error.message}`);
    ensured.push(created as Product);
  }
  console.log("Ensured products");
  return ensured.map(({ id, name, price }) => ({ id, name, price }));
}

async function seedRegisterSession(
  adminId: string,
  tenantId: string,
  facilityId: string
) {
  const { data: existing } = await supabase
    .from("register_sessions")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("facility_id", facilityId)
    .is("closed_at", null)
    .limit(1)
    .maybeSingle();
  if (existing?.id) {
    console.log("Reusing open register session");
    return { id: (existing as { id: string }).id };
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
  if (error) throw new Error(`Failed to create register session: ${error.message}`);
  console.log("Created register session");
  return { id: (data as { id: string }).id };
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
  const espresso = products.find((p) => p.name === "Espresso");
  const chocolate = products.find((p) => p.name === "Σοκολάτα");
  const croissant = products.find((p) => p.name === "Κρουασάν");

  if (!(espresso && chocolate && croissant)) {
    throw new Error("Required products missing for order items");
  }

  // Create order
  // Subtotal is full value of items; treat shows original price but is discounted to free
  const espressoPrice = Number(espresso?.price ?? 0);
  const chocolatePrice = Number(chocolate?.price ?? 0);
  const croissantPrice = Number(croissant?.price ?? 0);
  const subtotal = espressoPrice + chocolatePrice + croissantPrice;
  const couponCount = 0;
  const treatDiscount = espressoPrice; // espresso is treated
  const discountAmount = couponCount * 2 + treatDiscount;

  const { data: existingOrder } = await supabase
    .from("orders")
    .select("id")
    .eq("session_id", session.id)
    .limit(1)
    .maybeSingle();
  if (existingOrder?.id) {
    console.log("Sample order already exists — skipping");
    return;
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      session_id: session.id,
      subtotal,
      discount_amount: discountAmount,
      total_amount: subtotal - discountAmount,
      coupon_count: couponCount,
      created_by: staffId,
      tenant_id: tenantId,
      facility_id: facilityId,
    })
    .select("id")
    .single();
  if (orderError) throw new Error(`Failed to create order: ${orderError.message}`);

  // Create order items
  const orderItems = [
    {
      order_id: (order as { id: string }).id,
      product_id: espresso.id,
      quantity: 1,
      unit_price: Number(espresso.price ?? 0),
      line_total: 0,
      is_treat: true,
    },
    {
      order_id: (order as { id: string }).id,
      product_id: chocolate.id,
      quantity: 1,
      unit_price: Number(chocolate.price ?? 0),
      line_total: Number(chocolate.price ?? 0) * 1,
      is_treat: false,
    },
    {
      order_id: (order as { id: string }).id,
      product_id: croissant.id,
      quantity: 1,
      unit_price: Number(croissant.price ?? 0),
      line_total: Number(croissant.price ?? 0) * 1,
      is_treat: false,
    },
  ];

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItems);
  if (itemsError) {
    throw new Error(`Failed to create order items: ${itemsError.message}`);
  }

  console.log("Created sample order");
}

const HOURS_IN_A_DAY = 24;
const MINUTES_IN_AN_HOUR = 60;
const SECONDS_IN_A_MINUTE = 60;
const MILLISECONDS_IN_A_SECOND = 1000;
const MILLISECONDS_IN_A_DAY =
  HOURS_IN_A_DAY *
  MINUTES_IN_AN_HOUR *
  SECONDS_IN_A_MINUTE *
  MILLISECONDS_IN_A_SECOND;

const TWO_DAYS = 2;
const THREE_DAYS = 3;

async function seedAppointments(
  staffId: string,
  tenantId: string,
  facilityId: string
) {
  const appointments = [
    {
      customer_name: "Μαρία Παπαδοπούλου",
      contact_info: "6912345678",
      appointment_date: new Date(Date.now() + TWO_DAYS * MILLISECONDS_IN_A_DAY),
      num_children: 3,
      num_adults: 2,
      notes: "Γενέθλια παιδιού",
      created_by: staffId,
      tenant_id: tenantId,
      facility_id: facilityId,
    },
    {
      customer_name: "Γιώργος Δημητρίου",
      contact_info: "6923456789",
      appointment_date: new Date(
        Date.now() + THREE_DAYS * MILLISECONDS_IN_A_DAY
      ),
      num_children: 5,
      num_adults: 3,
      notes: "Σχολική εκδρομή",
      created_by: staffId,
      tenant_id: tenantId,
      facility_id: facilityId,
    },
  ];
  for (const a of appointments) {
    const { data: existing } = await supabase
      .from("appointments")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("facility_id", facilityId)
      .eq("appointment_date", a.appointment_date.toISOString())
      .ilike("customer_name", a.customer_name)
      .limit(1)
      .maybeSingle();
    if (existing?.id) continue;
    const { error } = await supabase.from("appointments").insert(a);
    if (error) throw new Error(`Failed to create appointment for ${a.customer_name}: ${error.message}`);
  }
  console.log("Ensured appointments");
}

async function seedFootballBookings(
  staffId: string,
  tenantId: string,
  facilityId: string
) {
  const bookings = [
    {
      customer_name: "Νίκος Αντωνίου",
      contact_info: "6934567890",
      booking_datetime: new Date(Date.now() + MILLISECONDS_IN_A_DAY),
      field_number: 1,
      num_players: 10,
      notes: "Εβδομαδιαίο παιχνίδι",
      created_by: staffId,
      tenant_id: tenantId,
      facility_id: facilityId,
    },
    {
      customer_name: "Κώστας Νικολάου",
      contact_info: "6945678901",
      booking_datetime: new Date(Date.now() + TWO_DAYS * MILLISECONDS_IN_A_DAY),
      field_number: 2,
      num_players: 8,
      notes: "Φιλικό παιχνίδι",
      created_by: staffId,
      tenant_id: tenantId,
      facility_id: facilityId,
    },
  ];
  for (const b of bookings) {
    const { data: existing } = await supabase
      .from("football_bookings")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("facility_id", facilityId)
      .eq("booking_datetime", b.booking_datetime.toISOString())
      .eq("field_number", b.field_number)
      .limit(1)
      .maybeSingle();
    if (existing?.id) continue;
    const { error } = await supabase.from("football_bookings").insert(b);
    if (error) throw new Error(`Failed to create football booking for field ${b.field_number}: ${error.message}`);
  }
  console.log("Ensured football bookings");
}

async function main() {
  try {
    console.log("Starting database seeding...");

    // Create users
    const admin = await createUser(
      SEED_ADMIN_EMAIL,
      SEED_ADMIN_PASSWORD,
      "admin",
      "Admin User"
    );
    const staff = await createUser(
      SEED_STAFF_EMAIL,
      SEED_STAFF_PASSWORD,
      "staff",
      "Staff User"
    );
    const secretary = await createUser(
      SEED_SECRETARY_EMAIL,
      SEED_SECRETARY_PASSWORD,
      "secretary",
      "Secretary User"
    );

    if (!(admin && staff && secretary)) {
      throw new Error("Failed to create required users");
    }

    // Create tenant and memberships
    const tenantId = await ensureTenant(SEED_TENANT_NAME);
    await addMember(tenantId, admin.id as string);
    await addMember(tenantId, staff.id as string);
    await addMember(tenantId, secretary.id as string);

    // Ensure facility and facility memberships
    const facilityId = await ensureFacility(tenantId);
    await addFacilityMember(facilityId, admin.id as string);
    await addFacilityMember(facilityId, staff.id as string);
    await addFacilityMember(facilityId, secretary.id as string);

    // Ensure settings and preferences
    await ensureTenantSettings(tenantId, facilityId);
    await Promise.all([
      ensureUserPreferences(admin.id as string),
      ensureUserPreferences(staff.id as string),
      ensureUserPreferences(secretary.id as string),
    ]);

    // Seed data
    const categories = await seedCategories(
      admin.id as string,
      tenantId,
      facilityId
    );
    const products = await seedProducts(
      categories,
      admin.id as string,
      tenantId,
      facilityId
    );
    const session = await seedRegisterSession(
      admin.id as string,
      tenantId,
      facilityId
    );

    await seedOrders({
      session,
      products,
      staffId: staff.id as string,
      tenantId,
      facilityId,
    });
    await seedAppointments(staff.id as string, tenantId, facilityId);
    await seedFootballBookings(staff.id as string, tenantId, facilityId);

    console.log("Database seeding completed successfully!");
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

main();
