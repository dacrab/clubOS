-- ClubOS Schema - Simplified and Clean
BEGIN;

-- Reduce logging verbosity
SET client_min_messages TO WARNING;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE user_role AS ENUM ('admin', 'staff', 'secretary');

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Users table
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'staff',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Categories for products
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  parent_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  CHECK (id != parent_id)
);

-- Products
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  price decimal(10,2) NOT NULL CHECK (price >= 0),
  stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= -1),
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT
);

-- ============================================================================
-- REGISTER & SALES
-- ============================================================================

-- Register sessions
CREATE TABLE register_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opened_at timestamptz DEFAULT now(),
  opened_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  closed_at timestamptz,
  notes jsonb,
  CHECK (closed_at IS NULL OR closed_at > opened_at)
);

-- Orders
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES register_sessions(id) ON DELETE CASCADE,
  subtotal decimal(10,2) NOT NULL CHECK (subtotal >= 0),
  discount_amount decimal(10,2) DEFAULT 0 CHECK (discount_amount >= 0),
  total_amount decimal(10,2) NOT NULL CHECK (total_amount >= 0),
  coupon_count integer DEFAULT 0 CHECK (coupon_count >= 0),
  created_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  CHECK (total_amount = subtotal - discount_amount)
);

-- Order items
CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price decimal(10,2) NOT NULL CHECK (unit_price >= 0),
  line_total decimal(10,2) NOT NULL CHECK (line_total >= 0),
  is_treat boolean DEFAULT false,
  is_deleted boolean DEFAULT false,
  deleted_at timestamptz,
  deleted_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  CHECK (
    (is_treat = true AND line_total = 0) OR
    (is_treat = false AND line_total = unit_price * quantity)
  ),
  CHECK (
    (is_deleted = false AND deleted_at IS NULL AND deleted_by IS NULL) OR
    (is_deleted = true AND deleted_at IS NOT NULL AND deleted_by IS NOT NULL)
  )
);

-- Register closing summaries
CREATE TABLE register_closings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES register_sessions(id) ON DELETE CASCADE UNIQUE,
  orders_count integer DEFAULT 0 CHECK (orders_count >= 0),
  orders_total decimal(10,2) DEFAULT 0 CHECK (orders_total >= 0),
  treat_count integer DEFAULT 0 CHECK (treat_count >= 0),
  treat_total decimal(10,2) DEFAULT 0 CHECK (treat_total >= 0),
  total_discounts decimal(10,2) DEFAULT 0 CHECK (total_discounts >= 0),
  notes jsonb,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- BOOKINGS
-- ============================================================================

-- General appointments
CREATE TABLE appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  contact_info text NOT NULL,
  appointment_date timestamptz NOT NULL,
  num_children integer NOT NULL CHECK (num_children > 0),
  num_adults integer DEFAULT 0 CHECK (num_adults >= 0),
  notes text,
  status text DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled','completed')),
  created_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT
);

-- Football field bookings
CREATE TABLE football_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  contact_info text NOT NULL,
  booking_datetime timestamptz NOT NULL,
  field_number integer NOT NULL CHECK (field_number BETWEEN 1 AND 5),
  num_players integer NOT NULL CHECK (num_players BETWEEN 2 AND 12),
  notes text,
  status text DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled','completed')),
  created_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  UNIQUE (field_number, booking_datetime)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_stock ON products(stock_quantity);
CREATE INDEX idx_register_sessions_active ON register_sessions(closed_at) WHERE closed_at IS NULL;
CREATE INDEX idx_orders_session ON orders(session_id);
CREATE INDEX idx_orders_date ON orders(created_at);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
CREATE INDEX idx_order_items_active ON order_items(is_deleted) WHERE is_deleted = false;
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_football_datetime ON football_bookings(booking_datetime);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE register_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE register_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE football_bookings ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "users_read" ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY "users_update" ON users FOR UPDATE TO authenticated
  USING (id = (select auth.uid()) OR (SELECT role FROM users WHERE id = (select auth.uid())) = 'admin');
CREATE POLICY "users_insert" ON users FOR INSERT TO public WITH CHECK (true);

-- Categories policies
CREATE POLICY "categories_read" ON categories FOR SELECT TO authenticated USING (true);
-- Restrict admin policy to write actions to avoid multiple permissive SELECT policies
CREATE POLICY "categories_admin_only" ON categories FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM users WHERE id = (select auth.uid())) = 'admin');
CREATE POLICY "categories_admin_update" ON categories FOR UPDATE TO authenticated
  USING ((SELECT role FROM users WHERE id = (select auth.uid())) = 'admin');
CREATE POLICY "categories_admin_delete" ON categories FOR DELETE TO authenticated
  USING ((SELECT role FROM users WHERE id = (select auth.uid())) = 'admin');

-- Products policies
CREATE POLICY "products_read" ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "products_admin_insert" ON products FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM users WHERE id = (select auth.uid())) = 'admin');
CREATE POLICY "products_admin_update" ON products FOR UPDATE TO authenticated
  USING ((SELECT role FROM users WHERE id = (select auth.uid())) = 'admin');
CREATE POLICY "products_admin_delete" ON products FOR DELETE TO authenticated
  USING ((SELECT role FROM users WHERE id = (select auth.uid())) = 'admin');

-- Register sessions policies
CREATE POLICY "sessions_all" ON register_sessions FOR ALL TO authenticated USING (true);

-- Orders policies
CREATE POLICY "orders_read" ON orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "orders_create" ON orders FOR INSERT TO authenticated 
  WITH CHECK (created_by = (select auth.uid()));

-- Order items policies
CREATE POLICY "order_items_all" ON order_items FOR ALL TO authenticated USING (true);

-- Register closings policies
CREATE POLICY "closings_all" ON register_closings FOR ALL TO authenticated USING (true);

-- Appointments policies
CREATE POLICY "appointments_read" ON appointments FOR SELECT TO authenticated USING (true);
CREATE POLICY "appointments_create" ON appointments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "appointments_admin_update" ON appointments FOR UPDATE TO authenticated
  USING ((SELECT role FROM users WHERE id = (select auth.uid())) = 'admin');
CREATE POLICY "appointments_admin_delete" ON appointments FOR DELETE TO authenticated
  USING ((SELECT role FROM users WHERE id = (select auth.uid())) = 'admin');

-- Football bookings policies
CREATE POLICY "football_read" ON football_bookings FOR SELECT TO authenticated USING (true);
CREATE POLICY "football_create" ON football_bookings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "football_admin_update" ON football_bookings FOR UPDATE TO authenticated
  USING ((SELECT role FROM users WHERE id = (select auth.uid())) = 'admin');
CREATE POLICY "football_admin_delete" ON football_bookings FOR DELETE TO authenticated
  USING ((SELECT role FROM users WHERE id = (select auth.uid())) = 'admin');

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Handle new auth user creation
CREATE OR REPLACE FUNCTION handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_username text;
  v_role public.user_role := 'staff';
BEGIN
  v_username := COALESCE(NEW.raw_user_meta_data->>'username', NEW.email, 'user_' || NEW.id::text);

  IF (NEW.raw_user_meta_data->>'role') IN ('admin','staff','secretary') THEN
    v_role := (NEW.raw_user_meta_data->>'role')::public.user_role;
  END IF;

  INSERT INTO public.users (id, username, role)
  VALUES (NEW.id, v_username, v_role)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
 RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Stock management
CREATE OR REPLACE FUNCTION check_product_stock()
 RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  available_stock integer;
  product_name text;
BEGIN
  SELECT stock_quantity, name INTO available_stock, product_name 
  FROM public.products WHERE id = NEW.product_id;
  
  IF available_stock = -1 THEN RETURN NEW; END IF;
  IF available_stock < NEW.quantity THEN
    RAISE EXCEPTION 'Insufficient stock for product "%". Available: %, Requested: %', 
      product_name, available_stock, NEW.quantity;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_stock_before_sale
  BEFORE INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION check_product_stock();

CREATE OR REPLACE FUNCTION update_product_stock()
 RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  UPDATE public.products 
  SET stock_quantity = stock_quantity - NEW.quantity 
  WHERE id = NEW.product_id AND stock_quantity != -1;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_stock_after_sale
  AFTER INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION update_product_stock();

-- Close register session function
CREATE OR REPLACE FUNCTION close_register_session(p_session_id uuid, p_notes jsonb DEFAULT NULL)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_closing_id uuid;
  session_stats record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.register_sessions WHERE id = p_session_id AND closed_at IS NULL) THEN
    RAISE EXCEPTION 'Register session not found or already closed';
  END IF;

    SELECT 
    COUNT(*) AS orders_count,
    COALESCE(SUM(o.total_amount), 0) AS orders_total,
    COALESCE(SUM((SELECT COUNT(*) FROM order_items oi 
      WHERE oi.order_id = o.id AND oi.is_treat = true AND oi.is_deleted = false)), 0) AS treat_count,
    -- Treat total should reflect original unit prices for treats (not zero line_total)
    COALESCE(SUM((SELECT SUM(oi.unit_price * oi.quantity) FROM order_items oi 
      WHERE oi.order_id = o.id AND oi.is_treat = true AND oi.is_deleted = false)), 0) AS treat_total,
    COALESCE(SUM(o.discount_amount), 0) AS total_discounts
  INTO session_stats
  FROM public.orders o
  WHERE o.session_id = p_session_id;

  INSERT INTO public.register_closings (
    session_id, orders_count, orders_total, treat_count, treat_total, total_discounts, notes
  ) VALUES (
    p_session_id, session_stats.orders_count, session_stats.orders_total, 
    session_stats.treat_count, session_stats.treat_total, session_stats.total_discounts, p_notes
  ) RETURNING id INTO v_closing_id;

  UPDATE public.register_sessions 
  SET closed_at = now(), notes = p_notes 
  WHERE id = p_session_id;

  RETURN v_closing_id;
END;
$$;

-- ============================================================================
-- STORAGE
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('product-images', 'product-images', true, 5242880, 
        ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "product_images_read" ON storage.objects 
  FOR SELECT TO authenticated USING (bucket_id = 'product-images');
CREATE POLICY "product_images_admin_write" ON storage.objects 
  FOR ALL TO authenticated 
  USING (bucket_id = 'product-images' AND (SELECT role FROM users WHERE id = (select auth.uid())) = 'admin');

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

COMMIT;
