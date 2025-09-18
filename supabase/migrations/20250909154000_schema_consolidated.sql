-- ClubOS Single Consolidated Schema

BEGIN;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Types
CREATE TYPE user_role AS ENUM ('admin', 'staff', 'secretary');
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'treat');

-- ============================================================================
-- CORE TABLES
-- ============================================================================


CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  role public.user_role NOT NULL DEFAULT 'staff',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  parent_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  CONSTRAINT no_self_reference CHECK (id != parent_id)
);

-- Codes (product-like table used by the app UI)
CREATE TABLE public.codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  price decimal(10,2) NOT NULL CHECK (price >= 0),
  stock integer NOT NULL DEFAULT 0,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL
);

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  price decimal(10,2) NOT NULL CHECK (price >= 0),
  stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= -1),
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT
);

-- ============================================================================
-- REGISTER & SALES TABLES
-- ============================================================================

CREATE TABLE public.register_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opened_at timestamptz NOT NULL DEFAULT now(),
  opened_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  closed_at timestamptz,
  closed_by uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  notes jsonb,
  CONSTRAINT valid_session_times CHECK (closed_at IS NULL OR closed_at > opened_at)
);

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.register_sessions(id) ON DELETE CASCADE,
  subtotal decimal(10,2) NOT NULL CHECK (subtotal >= 0),
  discount_amount decimal(10,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total_amount decimal(10,2) NOT NULL CHECK (total_amount >= 0),
  payment_method public.payment_method NOT NULL,
  card_discounts_applied integer NOT NULL DEFAULT 0 CHECK (card_discounts_applied >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  CONSTRAINT valid_total CHECK (total_amount = subtotal - discount_amount)
);

-- Sales (flat log used by UI and statistics)
CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  code_id uuid NOT NULL REFERENCES public.codes(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price decimal(10,2) NOT NULL CHECK (unit_price >= 0),
  total_price decimal(10,2) NOT NULL CHECK (total_price >= 0),
  is_treat boolean NOT NULL DEFAULT false,
  payment_method public.payment_method NOT NULL,
  sold_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean DEFAULT false,
  is_edited boolean DEFAULT false,
  original_code text,
  original_quantity integer
);

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price decimal(10,2) NOT NULL CHECK (unit_price >= 0),
  line_total decimal(10,2) NOT NULL CHECK (line_total >= 0),
  is_treat boolean NOT NULL DEFAULT false,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  deleted_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_line_total CHECK (line_total = unit_price * quantity),
  CONSTRAINT deletion_consistency CHECK (
    (is_deleted = false AND deleted_at IS NULL AND deleted_by IS NULL) OR
    (is_deleted = true AND deleted_at IS NOT NULL AND deleted_by IS NOT NULL)
  )
);

CREATE TABLE public.register_closings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.register_sessions(id) ON DELETE CASCADE,
  cash_sales_count integer NOT NULL DEFAULT 0 CHECK (cash_sales_count >= 0),
  cash_sales_total decimal(10,2) NOT NULL DEFAULT 0 CHECK (cash_sales_total >= 0),
  card_sales_count integer NOT NULL DEFAULT 0 CHECK (card_sales_count >= 0),
  card_sales_total decimal(10,2) NOT NULL DEFAULT 0 CHECK (card_sales_total >= 0),
  treat_count integer NOT NULL DEFAULT 0 CHECK (treat_count >= 0),
  treat_total decimal(10,2) NOT NULL DEFAULT 0 CHECK (treat_total >= 0),
  total_discounts integer NOT NULL DEFAULT 0 CHECK (total_discounts >= 0),
  notes jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT one_closing_per_session UNIQUE (session_id)
);

-- ============================================================================
-- BOOKING TABLES
-- ============================================================================

CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  contact_info text NOT NULL,
  appointment_date timestamptz NOT NULL,
  num_children integer NOT NULL CHECK (num_children > 0),
  num_adults integer NOT NULL DEFAULT 0 CHECK (num_adults >= 0),
  notes text,
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled','completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT
);

CREATE TABLE public.football_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  contact_info text NOT NULL,
  booking_datetime timestamptz NOT NULL,
  field_number integer NOT NULL CHECK (field_number BETWEEN 1 AND 5),
  num_players integer NOT NULL CHECK (num_players BETWEEN 2 AND 12),
  notes text,
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled','completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  CONSTRAINT unique_field_slot UNIQUE (field_number, booking_datetime)
);

-- ============================================================================
-- INDEXES (including covering FKs)
-- ============================================================================

CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_active ON public.users(is_active) WHERE is_active = true;
-- (codes indexes removed; table not created here)
CREATE INDEX idx_categories_parent ON public.categories(parent_id);
CREATE INDEX idx_categories_active ON public.categories(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_categories_created_by ON public.categories(created_by);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_active ON public.products(is_active) WHERE is_active = true;
CREATE INDEX idx_products_stock ON public.products(stock_quantity);
CREATE INDEX idx_products_name_search ON public.products USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_products_created_by ON public.products(created_by);
CREATE INDEX idx_sessions_open ON public.register_sessions(opened_at);
CREATE INDEX idx_sessions_active ON public.register_sessions(closed_at) WHERE closed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_closed_by ON public.register_sessions(closed_by);
CREATE INDEX IF NOT EXISTS idx_sessions_opened_by ON public.register_sessions(opened_by);
CREATE INDEX idx_orders_session ON public.orders(session_id);
CREATE INDEX idx_orders_date ON public.orders(created_at);
CREATE INDEX idx_orders_payment ON public.orders(payment_method);
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON public.orders(created_by);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_code_id ON public.sales(code_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_id ON public.sales(order_id);
CREATE INDEX idx_order_items_order ON public.order_items(order_id);
CREATE INDEX idx_order_items_product ON public.order_items(product_id);
CREATE INDEX idx_order_items_treats ON public.order_items(is_treat) WHERE is_treat = true;
CREATE INDEX idx_order_items_active ON public.order_items(is_deleted) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_order_items_deleted_by ON public.order_items(deleted_by);
CREATE INDEX idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_created_by ON public.appointments(created_by);
CREATE INDEX idx_football_datetime ON public.football_bookings(booking_datetime);
CREATE INDEX idx_football_field ON public.football_bookings(field_number);
CREATE INDEX idx_football_status ON public.football_bookings(status);
CREATE INDEX IF NOT EXISTS idx_football_created_by ON public.football_bookings(created_by);

-- ============================================================================
-- RLS POLICIES (auth uid via SELECT to avoid initplan cost)
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
-- (codes RLS skipped; table not created here)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.register_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.register_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.football_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "users_update" ON public.users FOR UPDATE TO authenticated
  USING (id = (select auth.uid()) OR (SELECT role FROM public.users WHERE id = (select auth.uid())) = 'admin')
  WITH CHECK ((id = (select auth.uid()) AND role != 'admin') OR (SELECT role FROM public.users WHERE id = (select auth.uid())) = 'admin');
CREATE POLICY "users_insert_any" ON public.users FOR INSERT TO PUBLIC WITH CHECK (true);

CREATE POLICY "categories_read" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "categories_admin_write" ON public.categories FOR INSERT TO authenticated WITH CHECK ((SELECT role FROM public.users WHERE id = (select auth.uid())) = 'admin');
CREATE POLICY "categories_admin_update" ON public.categories FOR UPDATE TO authenticated USING ((SELECT role FROM public.users WHERE id = (select auth.uid())) = 'admin');
CREATE POLICY "categories_admin_delete" ON public.categories FOR DELETE TO authenticated USING ((SELECT role FROM public.users WHERE id = (select auth.uid())) = 'admin');

-- (codes policies skipped; table not created here)

CREATE POLICY "products_read" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "products_admin_write" ON public.products FOR INSERT TO authenticated WITH CHECK ((SELECT role FROM public.users WHERE id = (select auth.uid())) = 'admin');
CREATE POLICY "products_admin_update" ON public.products FOR UPDATE TO authenticated USING ((SELECT role FROM public.users WHERE id = (select auth.uid())) = 'admin');
CREATE POLICY "products_admin_delete" ON public.products FOR DELETE TO authenticated USING ((SELECT role FROM public.users WHERE id = (select auth.uid())) = 'admin');

CREATE POLICY "sessions_read" ON public.register_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "sessions_write" ON public.register_sessions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "sessions_update" ON public.register_sessions FOR UPDATE TO authenticated USING (true);

CREATE POLICY "orders_read" ON public.orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "orders_create_own" ON public.orders FOR INSERT TO authenticated WITH CHECK (created_by = (select auth.uid()));

-- Sales policies
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sales_read" ON public.sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "sales_write" ON public.sales FOR INSERT TO authenticated WITH CHECK (sold_by = (select auth.uid()));

CREATE POLICY "order_items_read" ON public.order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "order_items_write" ON public.order_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "order_items_update" ON public.order_items FOR UPDATE TO authenticated USING (true);

CREATE POLICY "closings_read" ON public.register_closings FOR SELECT TO authenticated USING (true);
CREATE POLICY "closings_write" ON public.register_closings FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "appointments_read" ON public.appointments FOR SELECT TO authenticated USING (true);
CREATE POLICY "appointments_write" ON public.appointments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "appointments_admin_manage" ON public.appointments FOR UPDATE TO authenticated USING ((SELECT role FROM public.users WHERE id = (select auth.uid())) = 'admin');
CREATE POLICY "appointments_admin_delete" ON public.appointments FOR DELETE TO authenticated USING ((SELECT role FROM public.users WHERE id = (select auth.uid())) = 'admin');

CREATE POLICY "football_read" ON public.football_bookings FOR SELECT TO authenticated USING (true);
CREATE POLICY "football_write" ON public.football_bookings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "football_admin_manage" ON public.football_bookings FOR UPDATE TO authenticated USING ((SELECT role FROM public.users WHERE id = (select auth.uid())) = 'admin');
CREATE POLICY "football_admin_delete" ON public.football_bookings FOR DELETE TO authenticated USING ((SELECT role FROM public.users WHERE id = (select auth.uid())) = 'admin');

-- ============================================================================
-- FUNCTIONS & TRIGGERS (empty search_path, fully qualified refs)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_username text;
  v_role public.user_role := 'staff';
  v_role_text text;
BEGIN
  v_username := COALESCE(NEW.raw_user_meta_data->>'username', NEW.email, 'user_' || NEW.id::text);
  v_role_text := NEW.raw_user_meta_data->>'role';

  IF v_role_text IS NOT NULL AND v_role_text IN ('admin','staff','secretary') THEN
    v_role := v_role_text::public.user_role;
  END IF;

  INSERT INTO public.users (id, username, role)
  VALUES (NEW.id, v_username, v_role)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.check_product_stock()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  available_stock integer;
  product_name text;
BEGIN
  SELECT stock_quantity, name INTO available_stock, product_name FROM public.products WHERE id = NEW.product_id;
  IF available_stock = -1 THEN RETURN NEW; END IF;
  IF available_stock < NEW.quantity THEN
    RAISE EXCEPTION 'Insufficient stock for product "%". Available: %, Requested: %', product_name, available_stock, NEW.quantity;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_stock_before_sale
  BEFORE INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.check_product_stock();

CREATE OR REPLACE FUNCTION public.update_product_stock()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  UPDATE public.products SET stock_quantity = stock_quantity - NEW.quantity WHERE id = NEW.product_id AND stock_quantity != -1;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_stock_after_sale
  AFTER INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.update_product_stock();

CREATE OR REPLACE FUNCTION public.close_register_session(p_session_id uuid, p_notes jsonb DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_closing_id uuid;
  v_cash_count integer;
  v_cash_total decimal(10,2);
  v_card_count integer;
  v_card_total decimal(10,2);
  v_treat_count integer;
  v_treat_total decimal(10,2);
  v_total_discounts integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.register_sessions WHERE id = p_session_id AND closed_at IS NULL) THEN
    RAISE EXCEPTION 'Register session not found or already closed';
  END IF;

  WITH session_stats AS (
    SELECT 
      COUNT(CASE WHEN o.payment_method = 'cash' THEN 1 END) AS cash_orders,
      COALESCE(SUM(CASE WHEN o.payment_method = 'cash' THEN o.total_amount END), 0) AS cash_amount,
      COUNT(CASE WHEN o.payment_method = 'card' THEN 1 END) AS card_orders,
      COALESCE(SUM(CASE WHEN o.payment_method = 'card' THEN o.total_amount END), 0) AS card_amount,
      COALESCE(SUM((SELECT COUNT(*) FROM public.order_items oi WHERE oi.order_id = o.id AND oi.is_treat = true AND oi.is_deleted = false)), 0) AS treats,
      COALESCE(SUM((SELECT SUM(oi.line_total) FROM public.order_items oi WHERE oi.order_id = o.id AND oi.is_treat = true AND oi.is_deleted = false)), 0) AS treat_amount,
      COALESCE(SUM(o.card_discounts_applied), 0) AS discounts
    FROM public.orders o
    WHERE o.session_id = p_session_id
  )
  SELECT cash_orders, cash_amount, card_orders, card_amount, treats, treat_amount, discounts
  INTO v_cash_count, v_cash_total, v_card_count, v_card_total, v_treat_count, v_treat_total, v_total_discounts
  FROM session_stats;

  INSERT INTO public.register_closings (
    session_id, cash_sales_count, cash_sales_total, card_sales_count, card_sales_total,
    treat_count, treat_total, total_discounts, notes
  ) VALUES (
    p_session_id, v_cash_count, v_cash_total, v_card_count, v_card_total, v_treat_count, v_treat_total, v_total_discounts, p_notes
  ) RETURNING id INTO v_closing_id;

  UPDATE public.register_sessions SET closed_at = now(), closed_by = (select auth.uid()), notes = p_notes WHERE id = p_session_id;

  RETURN v_closing_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_permission(p_permission text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_role public.user_role;
BEGIN
  SELECT role INTO v_role FROM public.users WHERE id = (select auth.uid());
  IF v_role IS NULL THEN RETURN false; END IF;
  IF p_permission = 'registers:read' THEN RETURN true;
  ELSIF p_permission = 'registers:close' THEN RETURN v_role IN ('admin','secretary');
  ELSIF p_permission = 'codes:manage' THEN RETURN v_role = 'admin';
  ELSIF p_permission = 'appointments:manage' THEN RETURN v_role IN ('admin','secretary');
  ELSE RETURN false; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_user_details(user_id uuid, user_name text, user_role public.user_role)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  UPDATE public.users
  SET username = user_name,
      role = user_role,
      updated_at = now()
  WHERE id = user_id;
END;
$$;

-- ============================================================================
-- STORAGE
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('product-images','product-images', true, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "product_images_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'product-images');
DROP POLICY IF EXISTS "product_images_admin_write" ON storage.objects;
CREATE POLICY "product_images_admin_write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images' AND (SELECT role FROM public.users WHERE id = (select auth.uid())) = 'admin');
DROP POLICY IF EXISTS "product_images_admin_update" ON storage.objects;
CREATE POLICY "product_images_admin_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'product-images' AND (SELECT role FROM public.users WHERE id = (select auth.uid())) = 'admin');
DROP POLICY IF EXISTS "product_images_admin_delete" ON storage.objects;
CREATE POLICY "product_images_admin_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'product-images' AND (SELECT role FROM public.users WHERE id = (select auth.uid())) = 'admin');

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

COMMIT;


