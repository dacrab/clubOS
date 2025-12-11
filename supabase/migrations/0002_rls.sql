-- ============================================================================
-- ClubOS RLS Policies - Simplified
-- ============================================================================

BEGIN;

-- ===================
-- HELPER FUNCTIONS
-- ===================

-- Get user's accessible facility IDs
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
  WHERE m.user_id = auth.uid()
    AND (m.facility_id IS NULL OR m.facility_id = f.id);
$$;

-- Get user's tenant IDs
CREATE OR REPLACE FUNCTION public.user_tenant_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT tenant_id FROM memberships WHERE user_id = auth.uid();
$$;

-- Check if user has facility access
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

-- Check if user is admin/owner for a facility
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
    WHERE m.user_id = auth.uid()
      AND f.id = fid
      AND m.role IN ('owner', 'admin')
      AND (m.facility_id IS NULL OR m.facility_id = fid)
  );
$$;

-- ===================
-- ENABLE RLS
-- ===================

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

-- ===================
-- POLICIES: TENANTS
-- ===================

CREATE POLICY "Users can view their tenants"
  ON public.tenants FOR SELECT
  USING (id IN (SELECT user_tenant_ids()));

CREATE POLICY "Admins can update their tenants"
  ON public.tenants FOR UPDATE
  USING (id IN (SELECT tenant_id FROM memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

-- Service role for onboarding
CREATE POLICY "Service role manages tenants"
  ON public.tenants FOR ALL
  USING (auth.role() = 'service_role');

-- ===================
-- POLICIES: SUBSCRIPTIONS
-- ===================

CREATE POLICY "Users can view their subscription"
  ON public.subscriptions FOR SELECT
  USING (tenant_id IN (SELECT user_tenant_ids()));

CREATE POLICY "Service role manages subscriptions"
  ON public.subscriptions FOR ALL
  USING (auth.role() = 'service_role');

-- ===================
-- POLICIES: FACILITIES
-- ===================

CREATE POLICY "Users can view their facilities"
  ON public.facilities FOR SELECT
  USING (id IN (SELECT user_facility_ids()));

CREATE POLICY "Admins can manage facilities"
  ON public.facilities FOR ALL
  USING (is_facility_admin(id));

CREATE POLICY "Service role manages facilities"
  ON public.facilities FOR ALL
  USING (auth.role() = 'service_role');

-- ===================
-- POLICIES: USERS
-- ===================

CREATE POLICY "Users can view themselves"
  ON public.users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can view colleagues"
  ON public.users FOR SELECT
  USING (id IN (
    SELECT m2.user_id FROM memberships m1
    JOIN memberships m2 ON m1.tenant_id = m2.tenant_id
    WHERE m1.user_id = auth.uid()
  ));

CREATE POLICY "Users can update themselves"
  ON public.users FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Service role manages users"
  ON public.users FOR ALL
  USING (auth.role() = 'service_role');

-- ===================
-- POLICIES: MEMBERSHIPS
-- ===================

CREATE POLICY "Users can view their memberships"
  ON public.memberships FOR SELECT
  USING (user_id = auth.uid() OR tenant_id IN (SELECT user_tenant_ids()));

CREATE POLICY "Admins can manage memberships"
  ON public.memberships FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

CREATE POLICY "Service role manages memberships"
  ON public.memberships FOR ALL
  USING (auth.role() = 'service_role');

-- ===================
-- POLICIES: CATEGORIES
-- ===================

CREATE POLICY "Users can view categories"
  ON public.categories FOR SELECT
  USING (has_facility_access(facility_id));

CREATE POLICY "Admins can manage categories"
  ON public.categories FOR ALL
  USING (is_facility_admin(facility_id));

-- ===================
-- POLICIES: PRODUCTS
-- ===================

CREATE POLICY "Users can view products"
  ON public.products FOR SELECT
  USING (has_facility_access(facility_id));

CREATE POLICY "Admins can manage products"
  ON public.products FOR ALL
  USING (is_facility_admin(facility_id));

-- ===================
-- POLICIES: REGISTER SESSIONS
-- ===================

CREATE POLICY "Users can view sessions"
  ON public.register_sessions FOR SELECT
  USING (has_facility_access(facility_id));

CREATE POLICY "Users can open sessions"
  ON public.register_sessions FOR INSERT
  WITH CHECK (has_facility_access(facility_id));

CREATE POLICY "Users can close their sessions"
  ON public.register_sessions FOR UPDATE
  USING (has_facility_access(facility_id) AND (opened_by = auth.uid() OR is_facility_admin(facility_id)));

-- ===================
-- POLICIES: ORDERS
-- ===================

CREATE POLICY "Users can view orders"
  ON public.orders FOR SELECT
  USING (has_facility_access(facility_id));

CREATE POLICY "Users can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (has_facility_access(facility_id));

CREATE POLICY "Users can update their orders"
  ON public.orders FOR UPDATE
  USING (has_facility_access(facility_id) AND (created_by = auth.uid() OR is_facility_admin(facility_id)));

-- ===================
-- POLICIES: ORDER ITEMS
-- ===================

CREATE POLICY "Users can view order items"
  ON public.order_items FOR SELECT
  USING (order_id IN (SELECT id FROM orders WHERE has_facility_access(facility_id)));

CREATE POLICY "Users can manage order items"
  ON public.order_items FOR ALL
  USING (order_id IN (SELECT id FROM orders WHERE has_facility_access(facility_id)));

-- ===================
-- POLICIES: BOOKINGS
-- ===================

CREATE POLICY "Users can view bookings"
  ON public.bookings FOR SELECT
  USING (has_facility_access(facility_id));

CREATE POLICY "Users can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (has_facility_access(facility_id));

CREATE POLICY "Users can update bookings"
  ON public.bookings FOR UPDATE
  USING (has_facility_access(facility_id));

CREATE POLICY "Admins can delete bookings"
  ON public.bookings FOR DELETE
  USING (is_facility_admin(facility_id));

COMMIT;
