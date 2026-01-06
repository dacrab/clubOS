-- ============================================================================
-- ClubOS Functions, Triggers & RLS Policies
-- ============================================================================
-- This is the consolidated migration for all database logic:
-- - Helper functions for RLS
-- - Trigger functions (updated_at, stock, order totals, booking validation)
-- - All RLS policies (one per table per operation)
-- - Triggers
-- ============================================================================

BEGIN;

-- ===================
-- 1. FIX FUNCTION SEARCH_PATH (Security)
-- ===================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_product_stock()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_deleted = false THEN
    UPDATE products 
    SET stock_quantity = stock_quantity - NEW.quantity
    WHERE id = NEW.product_id AND track_inventory = true;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_deleted = false AND NEW.is_deleted = true THEN
      UPDATE products 
      SET stock_quantity = stock_quantity + OLD.quantity
      WHERE id = NEW.product_id AND track_inventory = true;
    ELSIF OLD.is_deleted = true AND NEW.is_deleted = false THEN
      UPDATE products 
      SET stock_quantity = stock_quantity - NEW.quantity
      WHERE id = NEW.product_id AND track_inventory = true;
    ELSIF OLD.quantity != NEW.quantity AND NEW.is_deleted = false THEN
      UPDATE products 
      SET stock_quantity = stock_quantity + OLD.quantity - NEW.quantity
      WHERE id = NEW.product_id AND track_inventory = true;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_order_totals()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_subtotal numeric(10,2);
BEGIN
  SELECT COALESCE(SUM(line_total), 0)
  INTO v_subtotal
  FROM order_items
  WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
    AND is_deleted = false
    AND is_treat = false;

  UPDATE orders
  SET 
    subtotal = v_subtotal,
    total_amount = v_subtotal - discount_amount + tax_amount
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_booking()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.type = 'football' AND (NEW.details->>'field_number') IS NULL THEN
    RAISE EXCEPTION 'Football bookings require field_number in details';
  END IF;
  
  IF NEW.type = 'birthday' AND (NEW.details->>'num_children') IS NULL THEN
    RAISE EXCEPTION 'Birthday bookings require num_children in details';
  END IF;
  
  RETURN NEW;
END;
$$;

-- ===================
-- 2. FIX RLS HELPER FUNCTIONS - Use subquery for auth.uid() (Performance)
-- ===================

CREATE OR REPLACE FUNCTION public.user_facility_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT f.id
  FROM facilities f
  JOIN memberships m ON m.tenant_id = f.tenant_id
  WHERE m.user_id = (SELECT auth.uid())
    AND (m.facility_id IS NULL OR m.facility_id = f.id);
$$;

CREATE OR REPLACE FUNCTION public.user_tenant_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT tenant_id FROM memberships WHERE user_id = (SELECT auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.has_facility_access(fid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_facility_ids() WHERE user_facility_ids = fid
  );
$$;

CREATE OR REPLACE FUNCTION public.is_facility_admin(fid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships m
    JOIN facilities f ON f.tenant_id = m.tenant_id
    WHERE m.user_id = (SELECT auth.uid())
      AND f.id = fid
      AND m.role IN ('owner', 'admin')
      AND (m.facility_id IS NULL OR m.facility_id = fid)
  );
$$;

-- ===================
-- 3. CONSOLIDATE RLS POLICIES
-- Using (SELECT auth.role()) and splitting FOR ALL into specific operations
-- ===================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their tenants" ON public.tenants;
DROP POLICY IF EXISTS "Admins can update their tenants" ON public.tenants;
DROP POLICY IF EXISTS "Service role manages tenants" ON public.tenants;

DROP POLICY IF EXISTS "Users can view their subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role manages subscriptions" ON public.subscriptions;

DROP POLICY IF EXISTS "Users can view their facilities" ON public.facilities;
DROP POLICY IF EXISTS "Admins can manage facilities" ON public.facilities;
DROP POLICY IF EXISTS "Service role manages facilities" ON public.facilities;

DROP POLICY IF EXISTS "Users can view themselves" ON public.users;
DROP POLICY IF EXISTS "Users can view colleagues" ON public.users;
DROP POLICY IF EXISTS "Users can update themselves" ON public.users;
DROP POLICY IF EXISTS "Service role manages users" ON public.users;

DROP POLICY IF EXISTS "Users can view their memberships" ON public.memberships;
DROP POLICY IF EXISTS "Admins can manage memberships" ON public.memberships;
DROP POLICY IF EXISTS "Service role manages memberships" ON public.memberships;

DROP POLICY IF EXISTS "Users can view categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;

DROP POLICY IF EXISTS "Users can view products" ON public.products;
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;

DROP POLICY IF EXISTS "Users can view sessions" ON public.register_sessions;
DROP POLICY IF EXISTS "Users can open sessions" ON public.register_sessions;
DROP POLICY IF EXISTS "Users can close their sessions" ON public.register_sessions;

DROP POLICY IF EXISTS "Users can view orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update their orders" ON public.orders;

DROP POLICY IF EXISTS "Users can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can manage order items" ON public.order_items;

DROP POLICY IF EXISTS "Users can view bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can delete bookings" ON public.bookings;

-- TENANTS: Single policy per operation
CREATE POLICY "tenants_select" ON public.tenants FOR SELECT
  USING ((SELECT auth.role()) = 'service_role' OR id IN (SELECT user_tenant_ids()));

CREATE POLICY "tenants_insert" ON public.tenants FOR INSERT
  WITH CHECK ((SELECT auth.role()) = 'service_role');

CREATE POLICY "tenants_update" ON public.tenants FOR UPDATE
  USING ((SELECT auth.role()) = 'service_role' OR id IN (
    SELECT tenant_id FROM memberships WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
  ));

CREATE POLICY "tenants_delete" ON public.tenants FOR DELETE
  USING ((SELECT auth.role()) = 'service_role');

-- SUBSCRIPTIONS: Single policy per operation
CREATE POLICY "subscriptions_select" ON public.subscriptions FOR SELECT
  USING ((SELECT auth.role()) = 'service_role' OR tenant_id IN (SELECT user_tenant_ids()));

CREATE POLICY "subscriptions_insert" ON public.subscriptions FOR INSERT
  WITH CHECK ((SELECT auth.role()) = 'service_role');

CREATE POLICY "subscriptions_update" ON public.subscriptions FOR UPDATE
  USING ((SELECT auth.role()) = 'service_role');

CREATE POLICY "subscriptions_delete" ON public.subscriptions FOR DELETE
  USING ((SELECT auth.role()) = 'service_role');

-- FACILITIES: Single policy per operation
CREATE POLICY "facilities_select" ON public.facilities FOR SELECT
  USING ((SELECT auth.role()) = 'service_role' OR id IN (SELECT user_facility_ids()));

CREATE POLICY "facilities_insert" ON public.facilities FOR INSERT
  WITH CHECK ((SELECT auth.role()) = 'service_role' OR is_facility_admin(id));

CREATE POLICY "facilities_update" ON public.facilities FOR UPDATE
  USING ((SELECT auth.role()) = 'service_role' OR is_facility_admin(id));

CREATE POLICY "facilities_delete" ON public.facilities FOR DELETE
  USING ((SELECT auth.role()) = 'service_role' OR is_facility_admin(id));

-- USERS: Single policy per operation
CREATE POLICY "users_select" ON public.users FOR SELECT
  USING (
    (SELECT auth.role()) = 'service_role' 
    OR id = (SELECT auth.uid())
    OR id IN (
      SELECT m2.user_id FROM memberships m1
      JOIN memberships m2 ON m1.tenant_id = m2.tenant_id
      WHERE m1.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "users_insert" ON public.users FOR INSERT
  WITH CHECK ((SELECT auth.role()) = 'service_role');

CREATE POLICY "users_update" ON public.users FOR UPDATE
  USING ((SELECT auth.role()) = 'service_role' OR id = (SELECT auth.uid()));

CREATE POLICY "users_delete" ON public.users FOR DELETE
  USING ((SELECT auth.role()) = 'service_role');

-- MEMBERSHIPS: Single policy per operation
CREATE POLICY "memberships_select" ON public.memberships FOR SELECT
  USING (
    (SELECT auth.role()) = 'service_role'
    OR user_id = (SELECT auth.uid())
    OR tenant_id IN (SELECT user_tenant_ids())
  );

CREATE POLICY "memberships_insert" ON public.memberships FOR INSERT
  WITH CHECK (
    (SELECT auth.role()) = 'service_role'
    OR tenant_id IN (
      SELECT tenant_id FROM memberships WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "memberships_update" ON public.memberships FOR UPDATE
  USING (
    (SELECT auth.role()) = 'service_role'
    OR tenant_id IN (
      SELECT tenant_id FROM memberships WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "memberships_delete" ON public.memberships FOR DELETE
  USING (
    (SELECT auth.role()) = 'service_role'
    OR tenant_id IN (
      SELECT tenant_id FROM memberships WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );

-- CATEGORIES: Single policy per operation
CREATE POLICY "categories_select" ON public.categories FOR SELECT
  USING (has_facility_access(facility_id));

CREATE POLICY "categories_insert" ON public.categories FOR INSERT
  WITH CHECK (is_facility_admin(facility_id));

CREATE POLICY "categories_update" ON public.categories FOR UPDATE
  USING (is_facility_admin(facility_id));

CREATE POLICY "categories_delete" ON public.categories FOR DELETE
  USING (is_facility_admin(facility_id));

-- PRODUCTS: Single policy per operation
CREATE POLICY "products_select" ON public.products FOR SELECT
  USING (has_facility_access(facility_id));

CREATE POLICY "products_insert" ON public.products FOR INSERT
  WITH CHECK (is_facility_admin(facility_id));

CREATE POLICY "products_update" ON public.products FOR UPDATE
  USING (is_facility_admin(facility_id));

CREATE POLICY "products_delete" ON public.products FOR DELETE
  USING (is_facility_admin(facility_id));

-- REGISTER_SESSIONS: Single policy per operation
CREATE POLICY "register_sessions_select" ON public.register_sessions FOR SELECT
  USING (has_facility_access(facility_id));

CREATE POLICY "register_sessions_insert" ON public.register_sessions FOR INSERT
  WITH CHECK (has_facility_access(facility_id));

CREATE POLICY "register_sessions_update" ON public.register_sessions FOR UPDATE
  USING (
    has_facility_access(facility_id) 
    AND (opened_by = (SELECT auth.uid()) OR is_facility_admin(facility_id))
  );

-- ORDERS: Single policy per operation
CREATE POLICY "orders_select" ON public.orders FOR SELECT
  USING (has_facility_access(facility_id));

CREATE POLICY "orders_insert" ON public.orders FOR INSERT
  WITH CHECK (has_facility_access(facility_id));

CREATE POLICY "orders_update" ON public.orders FOR UPDATE
  USING (
    has_facility_access(facility_id)
    AND (created_by = (SELECT auth.uid()) OR is_facility_admin(facility_id))
  );

-- ORDER_ITEMS: Single policy per operation
CREATE POLICY "order_items_select" ON public.order_items FOR SELECT
  USING (order_id IN (SELECT id FROM orders WHERE has_facility_access(facility_id)));

CREATE POLICY "order_items_insert" ON public.order_items FOR INSERT
  WITH CHECK (order_id IN (SELECT id FROM orders WHERE has_facility_access(facility_id)));

CREATE POLICY "order_items_update" ON public.order_items FOR UPDATE
  USING (order_id IN (SELECT id FROM orders WHERE has_facility_access(facility_id)));

CREATE POLICY "order_items_delete" ON public.order_items FOR DELETE
  USING (order_id IN (SELECT id FROM orders WHERE has_facility_access(facility_id)));

-- BOOKINGS: Single policy per operation
CREATE POLICY "bookings_select" ON public.bookings FOR SELECT
  USING (has_facility_access(facility_id));

CREATE POLICY "bookings_insert" ON public.bookings FOR INSERT
  WITH CHECK (has_facility_access(facility_id));

CREATE POLICY "bookings_update" ON public.bookings FOR UPDATE
  USING (has_facility_access(facility_id));

CREATE POLICY "bookings_delete" ON public.bookings FOR DELETE
  USING (is_facility_admin(facility_id));

-- ===================
-- 4. ADD MISSING INDEXES FOR FOREIGN KEYS
-- ===================

CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON public.subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_created_by ON public.products(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON public.orders(created_by);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_deleted_by ON public.order_items(deleted_by) WHERE deleted_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_created_by ON public.bookings(created_by);
CREATE INDEX IF NOT EXISTS idx_bookings_cancelled_by ON public.bookings(cancelled_by) WHERE cancelled_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_register_sessions_opened_by ON public.register_sessions(opened_by);
CREATE INDEX IF NOT EXISTS idx_register_sessions_closed_by ON public.register_sessions(closed_by) WHERE closed_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_categories_parent ON public.categories(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_register_sessions_facility ON public.register_sessions(facility_id);

-- ===================
-- 5. CREATE TRIGGERS
-- ===================

-- User sync from auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url);
  RETURN NEW;
END;
$$;

-- Drop existing triggers if they exist (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS set_updated_at ON public.tenants;
DROP TRIGGER IF EXISTS set_updated_at ON public.subscriptions;
DROP TRIGGER IF EXISTS set_updated_at ON public.facilities;
DROP TRIGGER IF EXISTS set_updated_at ON public.users;
DROP TRIGGER IF EXISTS set_updated_at ON public.categories;
DROP TRIGGER IF EXISTS set_updated_at ON public.products;
DROP TRIGGER IF EXISTS set_updated_at ON public.bookings;
DROP TRIGGER IF EXISTS on_order_item_change ON public.order_items;
DROP TRIGGER IF EXISTS on_order_item_totals ON public.order_items;
DROP TRIGGER IF EXISTS validate_booking_before_insert ON public.bookings;

-- Auth user sync trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.facilities
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Stock management trigger
CREATE TRIGGER on_order_item_change
  AFTER INSERT OR UPDATE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.update_product_stock();

-- Order totals trigger
CREATE TRIGGER on_order_item_totals
  AFTER INSERT OR UPDATE OR DELETE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.calculate_order_totals();

-- Booking validation trigger
CREATE TRIGGER validate_booking_before_insert
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.validate_booking();

COMMIT;
