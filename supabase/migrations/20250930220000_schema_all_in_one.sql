-- ClubOS Schema (Consolidated, Multi-tenant, Optimized)
BEGIN;

SET client_min_messages TO WARNING;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE user_role AS ENUM ('admin', 'staff', 'secretary');

-- Users table
CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  role public.user_role NOT NULL DEFAULT 'staff',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tenants
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Tenant members
CREATE TABLE public.tenant_members (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id)
);

-- Categories
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  parent_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  CHECK (id != parent_id)
);

-- Products
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price decimal(10,2) NOT NULL CHECK (price >= 0),
  stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= -1),
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT
);

-- Register sessions
CREATE TABLE public.register_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  opened_at timestamptz DEFAULT now(),
  opened_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  closed_at timestamptz,
  notes jsonb,
  updated_at timestamptz,
  CHECK (closed_at IS NULL OR closed_at > opened_at)
);

-- Orders
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.register_sessions(id) ON DELETE CASCADE,
  subtotal decimal(10,2) NOT NULL CHECK (subtotal >= 0),
  discount_amount decimal(10,2) DEFAULT 0 CHECK (discount_amount >= 0),
  total_amount decimal(10,2) NOT NULL CHECK (total_amount >= 0),
  coupon_count integer DEFAULT 0 CHECK (coupon_count >= 0),
  created_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  CHECK (total_amount = subtotal - discount_amount)
);

-- Order items
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price decimal(10,2) NOT NULL CHECK (unit_price >= 0),
  line_total decimal(10,2) NOT NULL CHECK (line_total >= 0),
  is_treat boolean DEFAULT false,
  is_deleted boolean DEFAULT false,
  deleted_at timestamptz,
  deleted_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  CHECK ((is_treat = true AND line_total = 0) OR (is_treat = false AND line_total = unit_price * quantity)),
  CHECK ((is_deleted = false AND deleted_at IS NULL AND deleted_by IS NULL) OR (is_deleted = true AND deleted_at IS NOT NULL AND deleted_by IS NOT NULL))
);

-- Register closings
CREATE TABLE public.register_closings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.register_sessions(id) ON DELETE CASCADE UNIQUE,
  orders_count integer DEFAULT 0 CHECK (orders_count >= 0),
  orders_total decimal(10,2) DEFAULT 0 CHECK (orders_total >= 0),
  treat_count integer DEFAULT 0 CHECK (treat_count >= 0),
  treat_total decimal(10,2) DEFAULT 0 CHECK (treat_total >= 0),
  total_discounts decimal(10,2) DEFAULT 0 CHECK (total_discounts >= 0),
  notes jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

-- Appointments
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  contact_info text NOT NULL,
  appointment_date timestamptz NOT NULL,
  num_children integer NOT NULL CHECK (num_children > 0),
  num_adults integer DEFAULT 0 CHECK (num_adults >= 0),
  notes text,
  status text DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled','completed')),
  created_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT
);

-- Football bookings
CREATE TABLE public.football_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  contact_info text NOT NULL,
  booking_datetime timestamptz NOT NULL,
  field_number integer NOT NULL CHECK (field_number BETWEEN 1 AND 5),
  num_players integer NOT NULL CHECK (num_players BETWEEN 2 AND 12),
  notes text,
  status text DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled','completed')),
  created_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  UNIQUE (field_number, booking_datetime)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_categories_parent ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_stock ON public.products(stock_quantity);
CREATE INDEX IF NOT EXISTS idx_register_sessions_active ON public.register_sessions(closed_at) WHERE closed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_session ON public.orders(session_id);
CREATE INDEX IF NOT EXISTS idx_orders_date ON public.orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_active ON public.order_items(is_deleted) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_football_datetime ON public.football_bookings(booking_datetime);
CREATE INDEX IF NOT EXISTS idx_categories_tenant ON public.categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant ON public.products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_register_sessions_tenant ON public.register_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_tenant ON public.orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant ON public.appointments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_football_bookings_tenant ON public.football_bookings(tenant_id);

-- Tenant-scoped uniques
CREATE UNIQUE INDEX IF NOT EXISTS categories_unique_name_per_tenant ON public.categories(tenant_id, lower(name));
CREATE UNIQUE INDEX IF NOT EXISTS products_unique_name_per_tenant ON public.products(tenant_id, lower(name));

-- RLS enablement
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.register_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.register_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.football_bookings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY users_read ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY users_update ON public.users FOR UPDATE TO authenticated USING (id = (select auth.uid()) OR (SELECT role FROM public.users WHERE id = (select auth.uid())) = 'admin');
CREATE POLICY users_insert ON public.users FOR INSERT TO public WITH CHECK (true);

CREATE POLICY tenants_read ON public.tenants FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.user_id = (select auth.uid()) AND tm.tenant_id = tenants.id));
CREATE POLICY tenant_members_select ON public.tenant_members FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY tenant_members_insert ON public.tenant_members FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY tenant_members_delete ON public.tenant_members FOR DELETE TO authenticated USING (user_id = (select auth.uid()));

CREATE POLICY categories_tenant_all ON public.categories FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.user_id = (select auth.uid()) AND tm.tenant_id = categories.tenant_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.user_id = (select auth.uid()) AND tm.tenant_id = categories.tenant_id));

CREATE POLICY products_tenant_all ON public.products FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.user_id = (select auth.uid()) AND tm.tenant_id = products.tenant_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.user_id = (select auth.uid()) AND tm.tenant_id = products.tenant_id));

CREATE POLICY register_sessions_tenant_all ON public.register_sessions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.user_id = (select auth.uid()) AND tm.tenant_id = register_sessions.tenant_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.user_id = (select auth.uid()) AND tm.tenant_id = register_sessions.tenant_id));

CREATE POLICY orders_tenant_all ON public.orders FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.user_id = (select auth.uid()) AND tm.tenant_id = orders.tenant_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.user_id = (select auth.uid()) AND tm.tenant_id = orders.tenant_id));

CREATE POLICY order_items_tenant_all ON public.order_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o JOIN public.tenant_members tm ON tm.user_id = (select auth.uid()) AND tm.tenant_id = o.tenant_id WHERE o.id = order_items.order_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o JOIN public.tenant_members tm ON tm.user_id = (select auth.uid()) AND tm.tenant_id = o.tenant_id WHERE o.id = order_items.order_id));

CREATE POLICY register_closings_tenant_all ON public.register_closings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.register_sessions s JOIN public.tenant_members tm ON tm.user_id = (select auth.uid()) AND tm.tenant_id = s.tenant_id WHERE s.id = register_closings.session_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.register_sessions s JOIN public.tenant_members tm ON tm.user_id = (select auth.uid()) AND tm.tenant_id = s.tenant_id WHERE s.id = register_closings.session_id));

CREATE POLICY appointments_tenant_all ON public.appointments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.user_id = (select auth.uid()) AND tm.tenant_id = appointments.tenant_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.user_id = (select auth.uid()) AND tm.tenant_id = appointments.tenant_id));

CREATE POLICY football_bookings_tenant_all ON public.football_bookings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.user_id = (select auth.uid()) AND tm.tenant_id = football_bookings.tenant_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.user_id = (select auth.uid()) AND tm.tenant_id = football_bookings.tenant_id));

-- Functions & triggers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_username text; v_role public.user_role := 'staff'; BEGIN
  v_username := COALESCE(NEW.raw_user_meta_data->>'username', NEW.email, 'user_' || NEW.id::text);
  IF (NEW.raw_user_meta_data->>'role') IN ('admin','staff','secretary') THEN
    v_role := (NEW.raw_user_meta_data->>'role')::public.user_role;
  END IF;
  INSERT INTO public.users (id, username, role) VALUES (NEW.id, v_username, v_role) ON CONFLICT (id) DO NOTHING;
  RETURN NEW; EXCEPTION WHEN OTHERS THEN RETURN NEW; END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER register_sessions_touch BEFORE UPDATE ON public.register_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER register_closings_touch BEFORE UPDATE ON public.register_closings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Integrity triggers to enforce same-tenant relationships
CREATE OR REPLACE FUNCTION public.assert_same_tenant_category_parent()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_parent_tenant uuid; BEGIN
  IF NEW.parent_id IS NULL THEN RETURN NEW; END IF;
  SELECT tenant_id INTO v_parent_tenant FROM public.categories WHERE id = NEW.parent_id;
  IF v_parent_tenant IS NULL OR v_parent_tenant <> NEW.tenant_id THEN
    RAISE EXCEPTION 'Parent category must belong to the same tenant';
  END IF;
  RETURN NEW; END; $$;
CREATE TRIGGER categories_same_tenant_parent BEFORE INSERT OR UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.assert_same_tenant_category_parent();

CREATE OR REPLACE FUNCTION public.assert_same_tenant_product_category()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_cat_tenant uuid; BEGIN
  IF NEW.category_id IS NULL THEN RETURN NEW; END IF;
  SELECT tenant_id INTO v_cat_tenant FROM public.categories WHERE id = NEW.category_id;
  IF v_cat_tenant IS NULL OR v_cat_tenant <> NEW.tenant_id THEN
    RAISE EXCEPTION 'Product category must belong to the same tenant';
  END IF; RETURN NEW; END; $$;
CREATE TRIGGER products_same_tenant_category BEFORE INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.assert_same_tenant_product_category();

CREATE OR REPLACE FUNCTION public.assert_same_tenant_order_session()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_session_tenant uuid; BEGIN
  SELECT tenant_id INTO v_session_tenant FROM public.register_sessions WHERE id = NEW.session_id;
  IF v_session_tenant IS NULL OR v_session_tenant <> NEW.tenant_id THEN
    RAISE EXCEPTION 'Order session must belong to the same tenant';
  END IF; RETURN NEW; END; $$;
CREATE TRIGGER orders_same_tenant_session BEFORE INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.assert_same_tenant_order_session();

CREATE OR REPLACE FUNCTION public.assert_same_tenant_order_item()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_order_tenant uuid; v_product_tenant uuid; BEGIN
  SELECT tenant_id INTO v_order_tenant FROM public.orders WHERE id = NEW.order_id;
  SELECT tenant_id INTO v_product_tenant FROM public.products WHERE id = NEW.product_id;
  IF v_order_tenant IS NULL OR v_product_tenant IS NULL OR v_order_tenant <> v_product_tenant THEN
    RAISE EXCEPTION 'Order item must belong to the same tenant as order and product';
  END IF; RETURN NEW; END; $$;
CREATE TRIGGER order_items_same_tenant BEFORE INSERT OR UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.assert_same_tenant_order_item();

-- Default tenant helpers
CREATE OR REPLACE FUNCTION public.default_tenant_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT tenant_id FROM public.tenant_members WHERE user_id = (select auth.uid()) LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.apply_default_tenant()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN IF NEW.tenant_id IS NULL THEN NEW.tenant_id := public.default_tenant_id(); END IF; RETURN NEW; END; $$;
CREATE TRIGGER categories_default_tenant BEFORE INSERT ON public.categories FOR EACH ROW EXECUTE FUNCTION public.apply_default_tenant();
CREATE TRIGGER products_default_tenant BEFORE INSERT ON public.products FOR EACH ROW EXECUTE FUNCTION public.apply_default_tenant();
CREATE TRIGGER sessions_default_tenant BEFORE INSERT ON public.register_sessions FOR EACH ROW EXECUTE FUNCTION public.apply_default_tenant();
CREATE TRIGGER orders_default_tenant BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.apply_default_tenant();
CREATE TRIGGER appointments_default_tenant BEFORE INSERT ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.apply_default_tenant();
CREATE TRIGGER football_default_tenant BEFORE INSERT ON public.football_bookings FOR EACH ROW EXECUTE FUNCTION public.apply_default_tenant();

-- Close register function
CREATE OR REPLACE FUNCTION public.close_register_session(p_session_id uuid, p_notes jsonb DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_closing_id uuid; session_stats record; BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.register_sessions WHERE id = p_session_id AND closed_at IS NULL) THEN
    RAISE EXCEPTION 'Register session not found or already closed';
  END IF;
  SELECT COUNT(*) AS orders_count,
         COALESCE(SUM(o.total_amount), 0) AS orders_total,
         COALESCE(SUM((SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id AND oi.is_treat = true AND oi.is_deleted = false)), 0) AS treat_count,
         COALESCE(SUM((SELECT SUM(oi.unit_price * oi.quantity) FROM order_items oi WHERE oi.order_id = o.id AND oi.is_treat = true AND oi.is_deleted = false)), 0) AS treat_total,
         COALESCE(SUM(o.discount_amount), 0) AS total_discounts
  INTO session_stats FROM public.orders o WHERE o.session_id = p_session_id;

  INSERT INTO public.register_closings (session_id, orders_count, orders_total, treat_count, treat_total, total_discounts, notes)
  VALUES (p_session_id, session_stats.orders_count, session_stats.orders_total, session_stats.treat_count, session_stats.treat_total, session_stats.total_discounts, p_notes)
  RETURNING id INTO v_closing_id;

  UPDATE public.register_sessions SET closed_at = now(), notes = p_notes WHERE id = p_session_id;
  RETURN v_closing_id; END; $$;

-- Storage bucket and policies
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('product-images', 'product-images', true, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY product_images_read ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'product-images');

CREATE OR REPLACE FUNCTION public.current_tenant_ids_for_user(p_user_id uuid)
RETURNS TABLE(tenant_id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT tm.tenant_id FROM public.tenant_members tm WHERE tm.user_id = p_user_id
$$;

CREATE POLICY product_images_write ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'product-images' AND EXISTS (
      SELECT 1 FROM public.current_tenant_ids_for_user((select auth.uid())) t
      WHERE position('tenant-' || t.tenant_id::text || '/' IN name) = 1
    )
  );

-- Grants
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

COMMIT;


