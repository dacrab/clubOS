-- ClubOS Baseline Multi-tenant Schema
BEGIN;

SET client_min_messages TO WARNING;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE public.user_role AS ENUM ('admin', 'staff', 'secretary');

-- Core tables
CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  role public.user_role NOT NULL DEFAULT 'staff',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.tenant_members (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id)
);

CREATE TABLE public.facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.facility_members (
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (facility_id, user_id)
);

-- Business tables
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  parent_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  CHECK (id != parent_id)
);

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
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

-- Transaction tables
CREATE TABLE public.register_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  opened_at timestamptz DEFAULT now(),
  opened_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  closed_at timestamptz,
  notes jsonb,
  updated_at timestamptz,
  CHECK (closed_at IS NULL OR closed_at > opened_at)
);

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.register_sessions(id) ON DELETE CASCADE,
  subtotal decimal(10,2) NOT NULL CHECK (subtotal >= 0),
  discount_amount decimal(10,2) DEFAULT 0 CHECK (discount_amount >= 0),
  total_amount decimal(10,2) NOT NULL CHECK (total_amount >= 0),
  coupon_count integer DEFAULT 0 CHECK (coupon_count >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  CHECK (total_amount = subtotal - discount_amount)
);

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
  updated_at timestamptz DEFAULT now(),
  CHECK ((is_treat = true AND line_total = 0) OR (is_treat = false AND line_total = unit_price * quantity)),
  CHECK ((is_deleted = false AND deleted_at IS NULL AND deleted_by IS NULL) OR (is_deleted = true AND deleted_at IS NOT NULL AND deleted_by IS NOT NULL))
);

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

-- Booking tables
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  contact_info text NOT NULL,
  appointment_date timestamptz NOT NULL,
  num_children integer NOT NULL CHECK (num_children > 0),
  num_adults integer DEFAULT 0 CHECK (num_adults >= 0),
  notes text,
  status text DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled','completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT
);

CREATE TABLE public.football_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  contact_info text NOT NULL,
  booking_datetime timestamptz NOT NULL,
  field_number integer NOT NULL CHECK (field_number BETWEEN 1 AND 5),
  num_players integer NOT NULL CHECK (num_players BETWEEN 2 AND 12),
  notes text,
  status text DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled','completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  UNIQUE (field_number, booking_datetime)
);

-- Configuration tables
CREATE TABLE public.tenant_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  facility_id uuid REFERENCES public.facilities(id) ON DELETE CASCADE,
  low_stock_threshold integer NOT NULL DEFAULT 3 CHECK (low_stock_threshold >= 0),
  allow_unlimited_stock boolean NOT NULL DEFAULT true,
  negative_stock_allowed boolean NOT NULL DEFAULT false,
  default_category_sort text NOT NULL DEFAULT 'name' CHECK (default_category_sort IN ('name','custom')),
  products_page_size integer NOT NULL DEFAULT 50 CHECK (products_page_size BETWEEN 10 AND 500),
  image_max_size_mb integer NOT NULL DEFAULT 5 CHECK (image_max_size_mb BETWEEN 1 AND 50),
  coupons_value numeric(10,2) NOT NULL DEFAULT 2.00,
  allow_treats boolean NOT NULL DEFAULT true,
  require_open_register_for_sale boolean NOT NULL DEFAULT true,
  currency_code text NOT NULL DEFAULT 'EUR',
  tax_rate_percent numeric(5,2) NOT NULL DEFAULT 0.00,
  receipt_footer_text text,
  booking_default_duration_min integer NOT NULL DEFAULT 60 CHECK (booking_default_duration_min BETWEEN 10 AND 600),
  football_fields_count integer NOT NULL DEFAULT 2 CHECK (football_fields_count BETWEEN 1 AND 20),
  appointment_buffer_min integer NOT NULL DEFAULT 15 CHECK (appointment_buffer_min BETWEEN 0 AND 120),
  prevent_overlaps boolean NOT NULL DEFAULT true,
  theme_default text NOT NULL DEFAULT 'system' CHECK (theme_default IN ('system','light','dark')),
  default_locale text NOT NULL DEFAULT 'en' CHECK (default_locale IN ('en','el')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (tenant_id, facility_id)
);

CREATE TABLE public.user_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  collapsed_sidebar boolean NOT NULL DEFAULT false,
  dense_table_mode boolean NOT NULL DEFAULT false,
  default_locale text CHECK (default_locale IN ('en','el')),
  theme text CHECK (theme IN ('system','light','dark')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_categories_parent ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_stock ON public.products(stock_quantity);
CREATE INDEX IF NOT EXISTS idx_register_sessions_active ON public.register_sessions(closed_at) WHERE closed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_session ON public.orders(session_id);
CREATE INDEX IF NOT EXISTS idx_orders_date ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_active ON public.order_items(is_deleted) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_football_datetime ON public.football_bookings(booking_datetime);
-- Common tenant scoping for facilities
CREATE INDEX IF NOT EXISTS idx_facilities_tenant ON public.facilities(tenant_id);
-- Cover common foreign-key lookups for better join performance
CREATE INDEX IF NOT EXISTS idx_categories_created_by ON public.categories(created_by);
CREATE INDEX IF NOT EXISTS idx_products_created_by ON public.products(created_by);
CREATE INDEX IF NOT EXISTS idx_register_sessions_opened_by ON public.register_sessions(opened_by);
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON public.orders(created_by);
CREATE INDEX IF NOT EXISTS idx_appointments_created_by ON public.appointments(created_by);
CREATE INDEX IF NOT EXISTS idx_football_bookings_created_by ON public.football_bookings(created_by);
-- Support lookups by user_id on membership junctions (PK is (tenant_id,user_id)/(facility_id,user_id))
CREATE INDEX IF NOT EXISTS idx_tenant_members_user ON public.tenant_members(user_id);
CREATE INDEX IF NOT EXISTS idx_facility_members_user ON public.facility_members(user_id);

-- Tenant/facility indexes
CREATE INDEX IF NOT EXISTS idx_categories_tenant_facility ON public.categories(tenant_id, facility_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant_facility ON public.products(tenant_id, facility_id);
CREATE INDEX IF NOT EXISTS idx_sessions_tenant_facility ON public.register_sessions(tenant_id, facility_id);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_facility ON public.orders(tenant_id, facility_id);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_facility ON public.appointments(tenant_id, facility_id);
CREATE INDEX IF NOT EXISTS idx_football_tenant_facility ON public.football_bookings(tenant_id, facility_id);

-- Unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS idx_facilities_name_per_tenant ON public.facilities(tenant_id, lower(name));
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name_per_tenant_facility ON public.categories(tenant_id, facility_id, lower(name));
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_name_per_tenant_facility ON public.products(tenant_id, facility_id, lower(name));

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_orders_tenant_facility_created_at ON public.orders(tenant_id, facility_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_tenant_facility_opened_at ON public.register_sessions(tenant_id, facility_id, opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_tenant_settings_lookup ON public.tenant_settings(tenant_id, facility_id);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facility_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.register_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.register_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.football_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT role FROM public.users WHERE id = (select auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.has_tenant_access(p_tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.user_id = (select auth.uid()) AND tm.tenant_id = p_tenant_id)
$$;

CREATE OR REPLACE FUNCTION public.has_facility_access(p_facility_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.facility_members fm 
    WHERE fm.user_id = (select auth.uid()) AND fm.facility_id = p_facility_id
  )
$$;

CREATE OR REPLACE FUNCTION public.has_tenant_facility_access(p_tenant_id uuid, p_facility_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.has_tenant_access(p_tenant_id) AND (
    public.current_user_role() = 'admin' OR public.has_facility_access(p_facility_id)
  )
$$;

-- RLS Policies
CREATE POLICY users_read ON public.users FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm_self
    JOIN public.tenant_members tm_other ON tm_self.tenant_id = tm_other.tenant_id
    WHERE tm_self.user_id = (select auth.uid()) AND tm_other.user_id = public.users.id
  ));

CREATE POLICY users_update ON public.users FOR UPDATE TO authenticated 
  USING (id = (select auth.uid()) OR public.current_user_role() = 'admin');

CREATE POLICY tenants_read ON public.tenants FOR SELECT TO authenticated 
  USING (public.has_tenant_access(id));

CREATE POLICY tenant_members_all ON public.tenant_members FOR ALL TO authenticated 
  USING (user_id = (select auth.uid())) 
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY facilities_read ON public.facilities FOR SELECT TO authenticated 
  USING (public.has_tenant_access(tenant_id));

CREATE POLICY facility_members_all ON public.facility_members FOR ALL TO authenticated 
  USING (user_id = (select auth.uid())) 
  WITH CHECK (user_id = (select auth.uid()));

-- Tenant/facility scoped policies
CREATE POLICY categories_all ON public.categories FOR ALL TO authenticated
  USING (public.has_tenant_facility_access(tenant_id, facility_id))
  WITH CHECK (public.has_tenant_facility_access(tenant_id, facility_id));

CREATE POLICY products_all ON public.products FOR ALL TO authenticated
  USING (public.has_tenant_facility_access(tenant_id, facility_id))
  WITH CHECK (public.has_tenant_facility_access(tenant_id, facility_id));

CREATE POLICY sessions_all ON public.register_sessions FOR ALL TO authenticated
  USING (public.has_tenant_facility_access(tenant_id, facility_id))
  WITH CHECK (public.has_tenant_facility_access(tenant_id, facility_id));

CREATE POLICY orders_all ON public.orders FOR ALL TO authenticated
  USING (public.has_tenant_facility_access(tenant_id, facility_id))
  WITH CHECK (public.has_tenant_facility_access(tenant_id, facility_id));

CREATE POLICY order_items_all ON public.order_items FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders o 
    WHERE o.id = order_items.order_id 
    AND public.has_tenant_facility_access(o.tenant_id, o.facility_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.orders o 
    WHERE o.id = order_items.order_id 
    AND public.has_tenant_facility_access(o.tenant_id, o.facility_id)
  ));

CREATE POLICY register_closings_all ON public.register_closings FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.register_sessions s 
    WHERE s.id = register_closings.session_id 
    AND public.has_tenant_facility_access(s.tenant_id, s.facility_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.register_sessions s 
    WHERE s.id = register_closings.session_id 
    AND public.has_tenant_facility_access(s.tenant_id, s.facility_id)
  ));

CREATE POLICY appointments_all ON public.appointments FOR ALL TO authenticated
  USING (public.has_tenant_facility_access(tenant_id, facility_id))
  WITH CHECK (public.has_tenant_facility_access(tenant_id, facility_id));

CREATE POLICY football_bookings_all ON public.football_bookings FOR ALL TO authenticated
  USING (public.has_tenant_facility_access(tenant_id, facility_id))
  WITH CHECK (public.has_tenant_facility_access(tenant_id, facility_id));

CREATE POLICY tenant_settings_select ON public.tenant_settings FOR SELECT TO authenticated
  USING (public.has_tenant_access(tenant_id));

CREATE POLICY tenant_settings_modify ON public.tenant_settings FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() = 'admin' AND public.has_tenant_access(tenant_id));

CREATE POLICY tenant_settings_update ON public.tenant_settings FOR UPDATE TO authenticated
  USING (public.current_user_role() = 'admin' AND public.has_tenant_access(tenant_id))
  WITH CHECK (public.current_user_role() = 'admin' AND public.has_tenant_access(tenant_id));

CREATE POLICY tenant_settings_delete ON public.tenant_settings FOR DELETE TO authenticated
  USING (public.current_user_role() = 'admin' AND public.has_tenant_access(tenant_id));

CREATE POLICY user_preferences_all ON public.user_preferences FOR ALL TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Auth integration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE 
  v_username text;
  v_role public.user_role := 'staff';
BEGIN
  v_username := COALESCE(NEW.raw_user_meta_data->>'username', NEW.email, 'user_' || NEW.id::text);
  IF (NEW.raw_user_meta_data->>'role') IN ('admin','staff','secretary') THEN
    v_role := (NEW.raw_user_meta_data->>'role')::public.user_role;
  END IF;
  INSERT INTO public.users (id, username, role) VALUES (NEW.id, v_username, v_role) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Timestamp updates
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN 
  NEW.updated_at = now(); 
  RETURN NEW; 
END; $$;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER register_sessions_updated_at BEFORE UPDATE ON public.register_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER register_closings_updated_at BEFORE UPDATE ON public.register_closings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER tenant_settings_updated_at BEFORE UPDATE ON public.tenant_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER user_preferences_updated_at BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER facilities_updated_at BEFORE UPDATE ON public.facilities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER order_items_updated_at BEFORE UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER football_bookings_updated_at BEFORE UPDATE ON public.football_bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Data integrity functions
CREATE OR REPLACE FUNCTION public.assert_same_tenant_category_parent()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_parent_tenant uuid;
BEGIN
  IF NEW.parent_id IS NULL THEN RETURN NEW; END IF;
  SELECT tenant_id INTO v_parent_tenant FROM public.categories WHERE id = NEW.parent_id;
  IF v_parent_tenant IS NULL OR v_parent_tenant <> NEW.tenant_id THEN
    RAISE EXCEPTION 'Parent category must belong to the same tenant';
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.assert_same_tenant_product_category()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_cat_tenant uuid;
BEGIN
  IF NEW.category_id IS NULL THEN RETURN NEW; END IF;
  SELECT tenant_id INTO v_cat_tenant FROM public.categories WHERE id = NEW.category_id;
  IF v_cat_tenant IS NULL OR v_cat_tenant <> NEW.tenant_id THEN
    RAISE EXCEPTION 'Product category must belong to the same tenant';
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.assert_facility_tenant_match()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_fac_tenant uuid;
BEGIN
  IF NEW.facility_id IS NULL THEN RETURN NEW; END IF;
  SELECT tenant_id INTO v_fac_tenant FROM public.facilities WHERE id = NEW.facility_id;
  IF v_fac_tenant IS NULL OR v_fac_tenant <> NEW.tenant_id THEN
    RAISE EXCEPTION 'Facility and tenant mismatch';
  END IF;
  RETURN NEW;
END; $$;

-- Integrity triggers
CREATE TRIGGER categories_parent_tenant_check BEFORE INSERT OR UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.assert_same_tenant_category_parent();
CREATE TRIGGER products_category_tenant_check BEFORE INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.assert_same_tenant_product_category();
CREATE TRIGGER categories_facility_tenant_check BEFORE INSERT OR UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.assert_facility_tenant_match();
CREATE TRIGGER products_facility_tenant_check BEFORE INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.assert_facility_tenant_match();
CREATE TRIGGER sessions_facility_tenant_check BEFORE INSERT OR UPDATE ON public.register_sessions FOR EACH ROW EXECUTE FUNCTION public.assert_facility_tenant_match();
CREATE TRIGGER orders_facility_tenant_check BEFORE INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.assert_facility_tenant_match();
CREATE TRIGGER appointments_facility_tenant_check BEFORE INSERT OR UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.assert_facility_tenant_match();
CREATE TRIGGER football_facility_tenant_check BEFORE INSERT OR UPDATE ON public.football_bookings FOR EACH ROW EXECUTE FUNCTION public.assert_facility_tenant_match();

-- Default tenant/facility assignment
CREATE OR REPLACE FUNCTION public.default_tenant_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT tm.tenant_id FROM public.tenant_members tm WHERE tm.user_id = (select auth.uid()) LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.default_facility_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT fm.facility_id FROM public.facility_members fm WHERE fm.user_id = (select auth.uid()) LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.apply_default_tenant_facility()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN 
  IF NEW.tenant_id IS NULL THEN NEW.tenant_id := public.default_tenant_id(); END IF;
  IF NEW.facility_id IS NULL THEN NEW.facility_id := public.default_facility_id(); END IF;
  RETURN NEW; 
END; $$;

-- Default assignment triggers
CREATE TRIGGER categories_defaults BEFORE INSERT ON public.categories FOR EACH ROW EXECUTE FUNCTION public.apply_default_tenant_facility();
CREATE TRIGGER products_defaults BEFORE INSERT ON public.products FOR EACH ROW EXECUTE FUNCTION public.apply_default_tenant_facility();
CREATE TRIGGER sessions_defaults BEFORE INSERT ON public.register_sessions FOR EACH ROW EXECUTE FUNCTION public.apply_default_tenant_facility();
CREATE TRIGGER orders_defaults BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.apply_default_tenant_facility();
CREATE TRIGGER appointments_defaults BEFORE INSERT ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.apply_default_tenant_facility();
CREATE TRIGGER football_defaults BEFORE INSERT ON public.football_bookings FOR EACH ROW EXECUTE FUNCTION public.apply_default_tenant_facility();

-- Register session management
CREATE OR REPLACE FUNCTION public.close_register_session(p_session_id uuid, p_notes jsonb DEFAULT NULL)
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
    COALESCE(SUM((SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id AND oi.is_treat = true AND oi.is_deleted = false)), 0) AS treat_count,
    COALESCE(SUM((SELECT SUM(oi.unit_price * oi.quantity) FROM order_items oi WHERE oi.order_id = o.id AND oi.is_treat = true AND oi.is_deleted = false)), 0) AS treat_total,
    COALESCE(SUM(o.discount_amount), 0) AS total_discounts
  INTO session_stats 
  FROM public.orders o 
  WHERE o.session_id = p_session_id;

  INSERT INTO public.register_closings (session_id, orders_count, orders_total, treat_count, treat_total, total_discounts, notes)
  VALUES (p_session_id, session_stats.orders_count, session_stats.orders_total, session_stats.treat_count, session_stats.treat_total, session_stats.total_discounts, p_notes)
  RETURNING id INTO v_closing_id;

  UPDATE public.register_sessions SET closed_at = now(), notes = p_notes WHERE id = p_session_id;
  RETURN v_closing_id;
END; $$;

-- Storage configuration
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

-- Permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

COMMIT;
