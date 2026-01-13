-- ClubOS Database Schema
-- Single consolidated migration with all fixes applied

BEGIN;

--------------------------------------------------------------------------------
-- TYPES
--------------------------------------------------------------------------------

CREATE TYPE public.user_role AS ENUM ('owner', 'admin', 'manager', 'staff');
CREATE TYPE public.booking_type AS ENUM ('birthday', 'football', 'event', 'other');
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'canceled', 'completed', 'no_show');
CREATE TYPE public.subscription_status AS ENUM ('trialing', 'active', 'canceled', 'past_due', 'unpaid', 'paused');

--------------------------------------------------------------------------------
-- TABLES
--------------------------------------------------------------------------------

-- Tenants (organizations)
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  settings jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Subscriptions (Stripe billing)
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text UNIQUE,
  status public.subscription_status NOT NULL DEFAULT 'trialing',
  plan_name text,
  current_period_end timestamptz,
  trial_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Facilities (locations within a tenant)
CREATE TABLE public.facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  phone text,
  email text,
  timezone text NOT NULL DEFAULT 'Europe/Athens',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);

-- Users (links to auth.users)
CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Memberships (user-tenant-facility relationships)
CREATE TABLE public.memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  facility_id uuid REFERENCES public.facilities(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'staff',
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Categories (product categories per facility)
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (id != parent_id),
  UNIQUE (facility_id, name)
);

-- Products
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  track_inventory boolean NOT NULL DEFAULT true,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  UNIQUE (facility_id, name)
);

-- Register Sessions (POS cash drawer sessions)
CREATE TABLE public.register_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  opened_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  closed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  opened_at timestamptz, -- Auto-set on first order
  closed_at timestamptz,
  opening_cash numeric(10,2) NOT NULL DEFAULT 0 CHECK (opening_cash >= 0),
  closing_cash numeric(10,2) CHECK (closing_cash IS NULL OR closing_cash >= 0),
  expected_cash numeric(10,2),
  notes text,
  summary jsonb,
  created_at timestamptz NOT NULL DEFAULT now() -- When session was created by staff
);
COMMENT ON COLUMN public.register_sessions.created_at IS 'When the register session was created/opened by staff';
COMMENT ON COLUMN public.register_sessions.opened_at IS 'When the first order was placed (auto-set)';

-- Orders
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.register_sessions(id) ON DELETE SET NULL,
  subtotal numeric(10,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  coupon_count integer NOT NULL DEFAULT 0 CHECK (coupon_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT
);

-- Order Items
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price numeric(10,2) NOT NULL CHECK (unit_price >= 0),
  line_total numeric(10,2) NOT NULL CHECK (line_total >= 0),
  is_treat boolean NOT NULL DEFAULT false,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Bookings (birthday parties, football fields, etc.)
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  type public.booking_type NOT NULL,
  status public.booking_status NOT NULL DEFAULT 'confirmed',
  customer_name text NOT NULL,
  customer_phone text,
  customer_email text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  details jsonb NOT NULL DEFAULT '{}',
  total_price numeric(10,2) CHECK (total_price IS NULL OR total_price >= 0),
  deposit_amount numeric(10,2) DEFAULT 0 CHECK (deposit_amount IS NULL OR deposit_amount >= 0),
  deposit_paid boolean NOT NULL DEFAULT false,
  notes text,
  internal_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  CHECK (ends_at > starts_at)
);

-- Keep-alive table for cron health checks
CREATE TABLE public.keep_alive (
  name text PRIMARY KEY
);

--------------------------------------------------------------------------------
-- INDEXES
--------------------------------------------------------------------------------

CREATE INDEX idx_facilities_tenant ON public.facilities(tenant_id);
CREATE INDEX idx_memberships_user ON public.memberships(user_id);
CREATE INDEX idx_memberships_tenant ON public.memberships(tenant_id);
CREATE INDEX idx_categories_facility ON public.categories(facility_id);
CREATE INDEX idx_products_facility ON public.products(facility_id);
CREATE INDEX idx_orders_facility ON public.orders(facility_id);
CREATE INDEX idx_orders_session ON public.orders(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX idx_order_items_order ON public.order_items(order_id);
CREATE INDEX idx_bookings_facility ON public.bookings(facility_id);
CREATE INDEX idx_bookings_starts_at ON public.bookings(starts_at);
CREATE INDEX idx_register_sessions_facility ON public.register_sessions(facility_id);

-- Unique constraint for memberships (handles NULL facility_id)
CREATE UNIQUE INDEX memberships_user_tenant_facility_idx 
  ON public.memberships (user_id, tenant_id, COALESCE(facility_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Prevent double-booking for football fields
CREATE UNIQUE INDEX idx_bookings_no_overlap 
  ON public.bookings (facility_id, (details->>'field_number'), starts_at) 
  WHERE type = 'football' AND status NOT IN ('canceled');

--------------------------------------------------------------------------------
-- ROW LEVEL SECURITY
--------------------------------------------------------------------------------

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.register_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keep_alive ENABLE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- PERMISSIONS
--------------------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.users, public.memberships, public.categories, public.products, public.order_items, public.bookings TO authenticated;
GRANT INSERT, UPDATE ON public.register_sessions, public.orders TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

--------------------------------------------------------------------------------
-- HELPER FUNCTIONS
--------------------------------------------------------------------------------

-- Get user's tenant IDs
CREATE FUNCTION public.user_tenant_ids() RETURNS SETOF uuid 
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT tenant_id FROM memberships WHERE user_id = (SELECT auth.uid());
$$;

-- Get user's facility IDs
CREATE FUNCTION public.user_facility_ids() RETURNS SETOF uuid 
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT f.id FROM facilities f
  JOIN memberships m ON m.tenant_id = f.tenant_id
  WHERE m.user_id = (SELECT auth.uid()) AND (m.facility_id IS NULL OR m.facility_id = f.id);
$$;

-- Check facility access
CREATE FUNCTION public.has_facility_access(fid uuid) RETURNS boolean 
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_facility_ids() WHERE user_facility_ids = fid);
$$;

-- Check if user is admin for facility
CREATE FUNCTION public.is_facility_admin(fid uuid) RETURNS boolean 
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships m JOIN facilities f ON f.tenant_id = m.tenant_id
    WHERE m.user_id = (SELECT auth.uid()) AND f.id = fid AND m.role IN ('owner', 'admin')
    AND (m.facility_id IS NULL OR m.facility_id = fid)
  );
$$;

--------------------------------------------------------------------------------
-- TRIGGER FUNCTIONS
--------------------------------------------------------------------------------

-- Auto-update updated_at timestamp
CREATE FUNCTION public.handle_updated_at() RETURNS trigger 
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN 
  NEW.updated_at = now(); 
  RETURN NEW; 
END;
$$;

-- Sync auth.users to public.users
CREATE FUNCTION public.handle_new_user() RETURNS trigger 
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (id, full_name, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'), NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url);
  RETURN NEW;
END;
$$;

-- Update stock on order item changes
CREATE FUNCTION public.update_product_stock() RETURNS trigger 
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NOT NEW.is_deleted THEN
    UPDATE products SET stock_quantity = stock_quantity - NEW.quantity WHERE id = NEW.product_id AND track_inventory;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NOT OLD.is_deleted AND NEW.is_deleted THEN
      UPDATE products SET stock_quantity = stock_quantity + OLD.quantity WHERE id = NEW.product_id AND track_inventory;
    ELSIF OLD.is_deleted AND NOT NEW.is_deleted THEN
      UPDATE products SET stock_quantity = stock_quantity - NEW.quantity WHERE id = NEW.product_id AND track_inventory;
    ELSIF OLD.quantity != NEW.quantity AND NOT NEW.is_deleted THEN
      UPDATE products SET stock_quantity = stock_quantity + OLD.quantity - NEW.quantity WHERE id = NEW.product_id AND track_inventory;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

--------------------------------------------------------------------------------
-- RPC FUNCTIONS
--------------------------------------------------------------------------------

-- Create order atomically (with auto-set opened_at)
CREATE FUNCTION public.create_order(
  p_facility_id uuid, 
  p_session_id uuid, 
  p_user_id uuid, 
  p_items jsonb, 
  p_coupon_count integer DEFAULT 0, 
  p_coupon_value numeric DEFAULT 0.50
) RETURNS jsonb 
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order_id uuid;
  v_subtotal numeric(10,2) := 0;
  v_discount numeric(10,2);
  v_total numeric(10,2);
  v_item jsonb;
  v_product record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM register_sessions WHERE id = p_session_id AND facility_id = p_facility_id AND closed_at IS NULL) THEN
    RETURN jsonb_build_object('error', 'No active register session');
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO v_product FROM products WHERE id = (v_item->>'product_id')::uuid AND facility_id = p_facility_id;
    IF v_product IS NULL THEN RETURN jsonb_build_object('error', 'Product not found'); END IF;
    IF v_product.track_inventory AND v_product.stock_quantity < (v_item->>'quantity')::integer THEN
      RETURN jsonb_build_object('error', 'Insufficient stock for: ' || v_product.name);
    END IF;
    IF NOT COALESCE((v_item->>'is_treat')::boolean, false) THEN
      v_subtotal := v_subtotal + (v_item->>'unit_price')::numeric * (v_item->>'quantity')::integer;
    END IF;
  END LOOP;

  v_discount := p_coupon_count * p_coupon_value;
  v_total := GREATEST(0, v_subtotal - v_discount);

  -- Auto-set opened_at on first order
  UPDATE register_sessions SET opened_at = now() WHERE id = p_session_id AND opened_at IS NULL;

  INSERT INTO orders (facility_id, session_id, subtotal, discount_amount, total_amount, coupon_count, created_by)
  VALUES (p_facility_id, p_session_id, v_subtotal, v_discount, v_total, p_coupon_count, p_user_id)
  RETURNING id INTO v_order_id;

  INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, line_total, is_treat)
  SELECT v_order_id, (item->>'product_id')::uuid, p.name, (item->>'quantity')::integer, (item->>'unit_price')::numeric,
    CASE WHEN COALESCE((item->>'is_treat')::boolean, false) THEN 0 ELSE (item->>'unit_price')::numeric * (item->>'quantity')::integer END,
    COALESCE((item->>'is_treat')::boolean, false)
  FROM jsonb_array_elements(p_items) item JOIN products p ON p.id = (item->>'product_id')::uuid;

  RETURN jsonb_build_object('id', v_order_id, 'subtotal', v_subtotal, 'discount_amount', v_discount, 'total_amount', v_total);
END;
$$;

-- Close register session
CREATE FUNCTION public.close_register_session(
  p_session_id uuid, 
  p_user_id uuid, 
  p_closing_cash numeric, 
  p_notes text DEFAULT NULL
) RETURNS jsonb 
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_session record;
  v_expected numeric(10,2);
  v_summary jsonb;
BEGIN
  SELECT * INTO v_session FROM register_sessions WHERE id = p_session_id AND closed_at IS NULL;
  IF v_session IS NULL THEN RETURN jsonb_build_object('error', 'Session not found or already closed'); END IF;

  SELECT COALESCE(SUM(total_amount), 0) + v_session.opening_cash INTO v_expected FROM orders WHERE session_id = p_session_id;

  SELECT jsonb_build_object(
    'orders_count', COUNT(*), 
    'total_sales', COALESCE(SUM(total_amount), 0),
    'total_discount', COALESCE(SUM(discount_amount), 0), 
    'coupons_used', COALESCE(SUM(coupon_count), 0),
    'cash_variance', p_closing_cash - v_expected
  ) INTO v_summary FROM orders WHERE session_id = p_session_id;

  UPDATE register_sessions 
  SET closed_at = now(), closed_by = p_user_id, closing_cash = p_closing_cash, 
      expected_cash = v_expected, notes = p_notes, summary = v_summary
  WHERE id = p_session_id;

  RETURN jsonb_build_object('id', p_session_id, 'expected_cash', v_expected, 'closing_cash', p_closing_cash, 'variance', p_closing_cash - v_expected, 'summary', v_summary);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_register_session TO authenticated;

--------------------------------------------------------------------------------
-- TRIGGERS
--------------------------------------------------------------------------------

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.facilities FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER on_order_item_change AFTER INSERT OR UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.update_product_stock();

--------------------------------------------------------------------------------
-- RLS POLICIES
--------------------------------------------------------------------------------

-- Tenants
CREATE POLICY tenants_select ON public.tenants FOR SELECT USING ((SELECT auth.role()) = 'service_role' OR id IN (SELECT user_tenant_ids()));
CREATE POLICY tenants_insert ON public.tenants FOR INSERT WITH CHECK ((SELECT auth.role()) = 'service_role');
CREATE POLICY tenants_update ON public.tenants FOR UPDATE USING ((SELECT auth.role()) = 'service_role' OR id IN (SELECT tenant_id FROM memberships WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin')));
CREATE POLICY tenants_delete ON public.tenants FOR DELETE USING ((SELECT auth.role()) = 'service_role');

-- Subscriptions
CREATE POLICY subscriptions_select ON public.subscriptions FOR SELECT USING ((SELECT auth.role()) = 'service_role' OR tenant_id IN (SELECT user_tenant_ids()));
CREATE POLICY subscriptions_insert ON public.subscriptions FOR INSERT WITH CHECK ((SELECT auth.role()) = 'service_role');
CREATE POLICY subscriptions_update ON public.subscriptions FOR UPDATE USING ((SELECT auth.role()) = 'service_role');
CREATE POLICY subscriptions_delete ON public.subscriptions FOR DELETE USING ((SELECT auth.role()) = 'service_role');

-- Facilities
CREATE POLICY facilities_select ON public.facilities FOR SELECT USING ((SELECT auth.role()) = 'service_role' OR id IN (SELECT user_facility_ids()));
CREATE POLICY facilities_insert ON public.facilities FOR INSERT WITH CHECK ((SELECT auth.role()) = 'service_role' OR is_facility_admin(id));
CREATE POLICY facilities_update ON public.facilities FOR UPDATE USING ((SELECT auth.role()) = 'service_role' OR is_facility_admin(id));
CREATE POLICY facilities_delete ON public.facilities FOR DELETE USING ((SELECT auth.role()) = 'service_role' OR is_facility_admin(id));

-- Users
CREATE POLICY users_select ON public.users FOR SELECT USING ((SELECT auth.role()) = 'service_role' OR id = (SELECT auth.uid()) OR id IN (SELECT m2.user_id FROM memberships m1 JOIN memberships m2 ON m1.tenant_id = m2.tenant_id WHERE m1.user_id = (SELECT auth.uid())));
CREATE POLICY users_insert ON public.users FOR INSERT WITH CHECK ((SELECT auth.role()) = 'service_role');
CREATE POLICY users_update ON public.users FOR UPDATE USING ((SELECT auth.role()) = 'service_role' OR id = (SELECT auth.uid()));
CREATE POLICY users_delete ON public.users FOR DELETE USING ((SELECT auth.role()) = 'service_role');

-- Memberships
CREATE POLICY memberships_select ON public.memberships FOR SELECT USING ((SELECT auth.role()) = 'service_role' OR user_id = (SELECT auth.uid()) OR tenant_id IN (SELECT user_tenant_ids()));
CREATE POLICY memberships_insert ON public.memberships FOR INSERT WITH CHECK ((SELECT auth.role()) = 'service_role' OR tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin')));
CREATE POLICY memberships_update ON public.memberships FOR UPDATE USING ((SELECT auth.role()) = 'service_role' OR tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin')));
CREATE POLICY memberships_delete ON public.memberships FOR DELETE USING ((SELECT auth.role()) = 'service_role' OR tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin')));

-- Categories
CREATE POLICY categories_select ON public.categories FOR SELECT USING (has_facility_access(facility_id));
CREATE POLICY categories_insert ON public.categories FOR INSERT WITH CHECK (is_facility_admin(facility_id));
CREATE POLICY categories_update ON public.categories FOR UPDATE USING (is_facility_admin(facility_id));
CREATE POLICY categories_delete ON public.categories FOR DELETE USING (is_facility_admin(facility_id));

-- Products
CREATE POLICY products_select ON public.products FOR SELECT USING (has_facility_access(facility_id));
CREATE POLICY products_insert ON public.products FOR INSERT WITH CHECK (is_facility_admin(facility_id));
CREATE POLICY products_update ON public.products FOR UPDATE USING (is_facility_admin(facility_id));
CREATE POLICY products_delete ON public.products FOR DELETE USING (is_facility_admin(facility_id));

-- Register Sessions
CREATE POLICY register_sessions_select ON public.register_sessions FOR SELECT USING (has_facility_access(facility_id));
CREATE POLICY register_sessions_insert ON public.register_sessions FOR INSERT WITH CHECK (has_facility_access(facility_id));
CREATE POLICY register_sessions_update ON public.register_sessions FOR UPDATE USING (has_facility_access(facility_id) AND (opened_by = (SELECT auth.uid()) OR is_facility_admin(facility_id)));

-- Orders
CREATE POLICY orders_select ON public.orders FOR SELECT USING (has_facility_access(facility_id));
CREATE POLICY orders_insert ON public.orders FOR INSERT WITH CHECK (has_facility_access(facility_id));
CREATE POLICY orders_update ON public.orders FOR UPDATE USING (has_facility_access(facility_id) AND (created_by = (SELECT auth.uid()) OR is_facility_admin(facility_id)));

-- Order Items
CREATE POLICY order_items_select ON public.order_items FOR SELECT USING (order_id IN (SELECT id FROM orders WHERE has_facility_access(facility_id)));
CREATE POLICY order_items_insert ON public.order_items FOR INSERT WITH CHECK (order_id IN (SELECT id FROM orders WHERE has_facility_access(facility_id)));
CREATE POLICY order_items_update ON public.order_items FOR UPDATE USING (order_id IN (SELECT id FROM orders WHERE has_facility_access(facility_id)));
CREATE POLICY order_items_delete ON public.order_items FOR DELETE USING (order_id IN (SELECT id FROM orders WHERE has_facility_access(facility_id)));

-- Bookings
CREATE POLICY bookings_select ON public.bookings FOR SELECT USING (has_facility_access(facility_id));
CREATE POLICY bookings_insert ON public.bookings FOR INSERT WITH CHECK (has_facility_access(facility_id));
CREATE POLICY bookings_update ON public.bookings FOR UPDATE USING (has_facility_access(facility_id));
CREATE POLICY bookings_delete ON public.bookings FOR DELETE USING (is_facility_admin(facility_id));

-- Keep Alive (service_role only)
CREATE POLICY keep_alive_all ON public.keep_alive FOR ALL USING ((SELECT auth.role()) = 'service_role');

COMMIT;
