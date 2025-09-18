import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import type { Category, Product, RegisterSession } from '@/types/database';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];

if (!(supabaseUrl && supabaseServiceKey)) {
  throw new Error('Supabase URL or service key not found');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createUser(
  email: string,
  password: string,
  role: 'admin' | 'staff' | 'secretary',
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

async function seedCategories(adminId: string) {
  const categories = [
    { name: 'Καφέδες', description: 'Όλα τα είδη καφέ', created_by: adminId },
    {
      name: 'Ζεστοί Καφέδες',
      description: 'Ζεστοί καφέδες',
      created_by: adminId,
    },
    {
      name: 'Κρύοι Καφέδες',
      description: 'Κρύοι καφέδες',
      created_by: adminId,
    },
    { name: 'Ροφήματα', description: 'Διάφορα ροφήματα', created_by: adminId },
    { name: 'Σνακ', description: 'Διάφορα σνακ', created_by: adminId },
  ];

  const { data, error } = await supabase.from('categories').insert(categories).select();
  if (error) {
    throw new Error(`Failed to create categories: ${error.message}`);
  }

  // Set parent relationships
  const mainCategory = data.find((c) => c.name === 'Καφέδες');
  const coffeeSubcategories = data.filter(
    (c) => c.name.includes('Καφέδες') && c.name !== 'Καφέδες'
  );

  if (mainCategory && coffeeSubcategories.length > 0) {
    const { error: updateError } = await supabase
      .from('categories')
      .update({ parent_id: mainCategory.id })
      .in(
        'id',
        coffeeSubcategories.map((c) => c.id)
      );

    if (updateError) {
      throw new Error(`Failed to update category parents: ${updateError.message}`);
    }
  }

  console.log('Created categories');
  return data;
}

async function seedProducts(categories: Category[], adminId: string) {
  const hotCoffeeCategory = categories.find((c) => c.name === 'Ζεστοί Καφέδες');
  const coldCoffeeCategory = categories.find((c) => c.name === 'Κρύοι Καφέδες');
  const beverageCategory = categories.find((c) => c.name === 'Ροφήματα');
  const snackCategory = categories.find((c) => c.name === 'Σνακ');

  const products = [
    // Hot Coffees
    {
      name: 'Espresso',
      price: 2.0,
      stock_quantity: -1,
      category_id: hotCoffeeCategory?.id,
      created_by: adminId,
    },
    {
      name: 'Cappuccino',
      price: 3.0,
      stock_quantity: -1,
      category_id: hotCoffeeCategory?.id,
      created_by: adminId,
    },
    {
      name: 'Latte',
      price: 3.5,
      stock_quantity: -1,
      category_id: hotCoffeeCategory?.id,
      created_by: adminId,
    },

    // Cold Coffees
    {
      name: 'Freddo Espresso',
      price: 3.0,
      stock_quantity: -1,
      category_id: coldCoffeeCategory?.id,
      created_by: adminId,
    },
    {
      name: 'Freddo Cappuccino',
      price: 3.5,
      stock_quantity: -1,
      category_id: coldCoffeeCategory?.id,
      created_by: adminId,
    },
    {
      name: 'Iced Latte',
      price: 4.0,
      stock_quantity: -1,
      category_id: coldCoffeeCategory?.id,
      created_by: adminId,
    },

    // Beverages
    {
      name: 'Σοκολάτα',
      price: 3.5,
      stock_quantity: -1,
      category_id: beverageCategory?.id,
      created_by: adminId,
    },
    {
      name: 'Τσάι',
      price: 2.5,
      stock_quantity: -1,
      category_id: beverageCategory?.id,
      created_by: adminId,
    },
    {
      name: 'Χυμός Πορτοκάλι',
      price: 3.0,
      stock_quantity: -1,
      category_id: beverageCategory?.id,
      created_by: adminId,
    },

    // Snacks
    {
      name: 'Κρουασάν',
      price: 2.0,
      stock_quantity: 20,
      category_id: snackCategory?.id,
      created_by: adminId,
    },
    {
      name: 'Σάντουιτς',
      price: 3.5,
      stock_quantity: 15,
      category_id: snackCategory?.id,
      created_by: adminId,
    },
    {
      name: 'Τοστ',
      price: 2.5,
      stock_quantity: 25,
      category_id: snackCategory?.id,
      created_by: adminId,
    },
  ];

  const { data, error } = await supabase.from('products').insert(products).select();
  if (error) {
    throw new Error(`Failed to create products: ${error.message}`);
  }

  console.log('Created products');
  return data;
}

async function seedRegisterSession(adminId: string) {
  const { data, error } = await supabase
    .from('register_sessions')
    .insert({ opened_by: adminId })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create register session: ${error.message}`);
  }

  console.log('Created register session');
  return data;
}

async function seedOrders(session: RegisterSession, products: Product[], staffId: string) {
  const espresso = products.find((p) => p.name === 'Espresso');
  const chocolate = products.find((p) => p.name === 'Σοκολάτα');
  const croissant = products.find((p) => p.name === 'Κρουασάν');

  // Create order
  const subtotal =
    Number(espresso?.price ?? 0) + Number(chocolate?.price ?? 0) + Number(croissant?.price ?? 0);
  const discountAmount = 0;

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      session_id: session.id,
      subtotal,
      discount_amount: discountAmount,
      total_amount: subtotal - discountAmount,
      payment_method: 'cash',
      card_discounts_applied: 0,
      created_by: staffId,
    })
    .select()
    .single();

  if (orderError) {
    throw new Error(`Failed to create order: ${orderError.message}`);
  }

  // Create order items
  const orderItems = [
    {
      order_id: order.id,
      product_id: espresso?.id,
      quantity: 1,
      unit_price: Number(espresso?.price ?? 0),
      line_total: Number(espresso?.price ?? 0) * 1,
      is_treat: true,
    },
    {
      order_id: order.id,
      product_id: chocolate?.id,
      quantity: 1,
      unit_price: Number(chocolate?.price ?? 0),
      line_total: Number(chocolate?.price ?? 0) * 1,
      is_treat: false,
    },
    {
      order_id: order.id,
      product_id: croissant?.id,
      quantity: 1,
      unit_price: Number(croissant?.price ?? 0),
      line_total: Number(croissant?.price ?? 0) * 1,
      is_treat: false,
    },
  ];

  const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
  if (itemsError) {
    throw new Error(`Failed to create order items: ${itemsError.message}`);
  }

  console.log('Created sample order');
}

const HOURS_IN_A_DAY = 24;
const MINUTES_IN_AN_HOUR = 60;
const SECONDS_IN_A_MINUTE = 60;
const MILLISECONDS_IN_A_SECOND = 1000;
const MILLISECONDS_IN_A_DAY =
  HOURS_IN_A_DAY * MINUTES_IN_AN_HOUR * SECONDS_IN_A_MINUTE * MILLISECONDS_IN_A_SECOND;

const TWO_DAYS = 2;
const THREE_DAYS = 3;

async function seedAppointments(staffId: string) {
  const appointments = [
    {
      customer_name: 'Μαρία Παπαδοπούλου',
      contact_info: '6912345678',
      appointment_date: new Date(Date.now() + TWO_DAYS * MILLISECONDS_IN_A_DAY),
      num_children: 3,
      num_adults: 2,
      notes: 'Γενέθλια παιδιού',
      created_by: staffId,
    },
    {
      customer_name: 'Γιώργος Δημητρίου',
      contact_info: '6923456789',
      appointment_date: new Date(Date.now() + THREE_DAYS * MILLISECONDS_IN_A_DAY),
      num_children: 5,
      num_adults: 3,
      notes: 'Σχολική εκδρομή',
      created_by: staffId,
    },
  ];

  const { error } = await supabase.from('appointments').insert(appointments);
  if (error) {
    throw new Error(`Failed to create appointments: ${error.message}`);
  }

  console.log('Created appointments');
}

async function seedFootballBookings(staffId: string) {
  const bookings = [
    {
      customer_name: 'Νίκος Αντωνίου',
      contact_info: '6934567890',
      booking_datetime: new Date(Date.now() + MILLISECONDS_IN_A_DAY),
      field_number: 1,
      num_players: 10,
      notes: 'Εβδομαδιαίο παιχνίδι',
      created_by: staffId,
    },
    {
      customer_name: 'Κώστας Νικολάου',
      contact_info: '6945678901',
      booking_datetime: new Date(Date.now() + TWO_DAYS * MILLISECONDS_IN_A_DAY),
      field_number: 2,
      num_players: 8,
      notes: 'Φιλικό παιχνίδι',
      created_by: staffId,
    },
  ];

  const { error } = await supabase.from('football_bookings').insert(bookings);
  if (error) {
    throw new Error(`Failed to create football bookings: ${error.message}`);
  }

  console.log('Created football bookings');
}

async function main() {
  try {
    console.log('Starting database seeding...');

    // Create users
    const admin = await createUser('admin@example.com', 'admin123', 'admin', 'Admin User');
    const staff = await createUser('staff@example.com', 'staff123', 'staff', 'Staff User');
    const secretary = await createUser(
      'secretary@example.com',
      'secretary123',
      'secretary',
      'Secretary User'
    );

    if (!(admin && staff && secretary)) {
      throw new Error('Failed to create required users');
    }

    // Seed data
    const categories = await seedCategories(admin.id);
    const products = await seedProducts(categories, admin.id);
    const session = await seedRegisterSession(admin.id);

    await seedOrders(session, products, staff.id);
    await seedAppointments(staff.id);
    await seedFootballBookings(staff.id);

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

main();
