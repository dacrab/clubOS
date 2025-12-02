-- ============================================================================
-- ClubOS Database Schema v2.0
-- Migration 9: Row Level Security Policies
-- ============================================================================

BEGIN;

-- ============================================================================
-- Enable RLS on All Tables
-- ============================================================================

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

-- ============================================================================
-- Users Policies
-- ============================================================================

CREATE POLICY users_select ON public.users FOR SELECT TO authenticated
  USING (public.has_shared_tenant(id) OR id = (select auth.uid()));

CREATE POLICY users_update ON public.users FOR UPDATE TO authenticated
  USING (id = (select auth.uid()) OR (public.is_admin() AND public.has_shared_tenant(id)))
  WITH CHECK (id = (select auth.uid()) OR (public.is_admin() AND public.has_shared_tenant(id)));

-- ============================================================================
-- Tenants Policies
-- ============================================================================

CREATE POLICY tenants_select ON public.tenants FOR SELECT TO authenticated
  USING (public.has_tenant_access(id));

CREATE POLICY tenants_update ON public.tenants FOR UPDATE TO authenticated
  USING (public.is_admin() AND public.has_tenant_access(id))
  WITH CHECK (public.is_admin() AND public.has_tenant_access(id));

-- ============================================================================
-- Tenant Members Policies
-- ============================================================================

CREATE POLICY tenant_members_select ON public.tenant_members FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid()) OR 
    (public.is_admin() AND tenant_id IN (SELECT public.current_user_tenant_ids()))
  );

CREATE POLICY tenant_members_insert ON public.tenant_members FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin() AND tenant_id IN (SELECT public.current_user_tenant_ids())
  );

CREATE POLICY tenant_members_update ON public.tenant_members FOR UPDATE TO authenticated
  USING (public.is_admin() AND tenant_id IN (SELECT public.current_user_tenant_ids()))
  WITH CHECK (public.is_admin() AND tenant_id IN (SELECT public.current_user_tenant_ids()));

CREATE POLICY tenant_members_delete ON public.tenant_members FOR DELETE TO authenticated
  USING (public.is_admin() AND tenant_id IN (SELECT public.current_user_tenant_ids()));

-- ============================================================================
-- Facilities Policies
-- ============================================================================

CREATE POLICY facilities_select ON public.facilities FOR SELECT TO authenticated
  USING (public.has_tenant_access(tenant_id));

CREATE POLICY facilities_insert ON public.facilities FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND public.has_tenant_access(tenant_id));

CREATE POLICY facilities_update ON public.facilities FOR UPDATE TO authenticated
  USING (public.is_admin() AND public.has_tenant_access(tenant_id))
  WITH CHECK (public.is_admin() AND public.has_tenant_access(tenant_id));

CREATE POLICY facilities_delete ON public.facilities FOR DELETE TO authenticated
  USING (public.is_admin() AND public.has_tenant_access(tenant_id));

-- ============================================================================
-- Facility Members Policies
-- ============================================================================

CREATE POLICY facility_members_select ON public.facility_members FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid()) OR 
    (public.is_admin() AND public.has_facility_in_user_tenants(facility_id))
  );

CREATE POLICY facility_members_insert ON public.facility_members FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND public.has_facility_in_user_tenants(facility_id));

CREATE POLICY facility_members_update ON public.facility_members FOR UPDATE TO authenticated
  USING (public.is_admin() AND public.has_facility_in_user_tenants(facility_id))
  WITH CHECK (public.is_admin() AND public.has_facility_in_user_tenants(facility_id));

CREATE POLICY facility_members_delete ON public.facility_members FOR DELETE TO authenticated
  USING (public.is_admin() AND public.has_facility_in_user_tenants(facility_id));

-- ============================================================================
-- Categories Policies
-- ============================================================================

CREATE POLICY categories_select ON public.categories FOR SELECT TO authenticated
  USING (public.has_tenant_facility_access(tenant_id, facility_id));

CREATE POLICY categories_insert ON public.categories FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND public.has_tenant_facility_access(tenant_id, facility_id));

CREATE POLICY categories_update ON public.categories FOR UPDATE TO authenticated
  USING (public.is_admin() AND public.has_tenant_facility_access(tenant_id, facility_id))
  WITH CHECK (public.is_admin() AND public.has_tenant_facility_access(tenant_id, facility_id));

CREATE POLICY categories_delete ON public.categories FOR DELETE TO authenticated
  USING (public.is_admin() AND public.has_tenant_facility_access(tenant_id, facility_id));

-- ============================================================================
-- Products Policies
-- ============================================================================

CREATE POLICY products_select ON public.products FOR SELECT TO authenticated
  USING (public.has_tenant_facility_access(tenant_id, facility_id));

CREATE POLICY products_insert ON public.products FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND public.has_tenant_facility_access(tenant_id, facility_id));

CREATE POLICY products_update ON public.products FOR UPDATE TO authenticated
  USING (public.is_admin() AND public.has_tenant_facility_access(tenant_id, facility_id))
  WITH CHECK (public.is_admin() AND public.has_tenant_facility_access(tenant_id, facility_id));

CREATE POLICY products_delete ON public.products FOR DELETE TO authenticated
  USING (public.is_admin() AND public.has_tenant_facility_access(tenant_id, facility_id));

-- ============================================================================
-- Register Sessions Policies
-- ============================================================================

CREATE POLICY sessions_select ON public.register_sessions FOR SELECT TO authenticated
  USING (public.has_tenant_facility_access(tenant_id, facility_id));

CREATE POLICY sessions_insert ON public.register_sessions FOR INSERT TO authenticated
  WITH CHECK (public.has_tenant_facility_access(tenant_id, facility_id));

CREATE POLICY sessions_update ON public.register_sessions FOR UPDATE TO authenticated
  USING (public.has_tenant_facility_access(tenant_id, facility_id))
  WITH CHECK (public.has_tenant_facility_access(tenant_id, facility_id));

-- ============================================================================
-- Orders Policies
-- ============================================================================

CREATE POLICY orders_select ON public.orders FOR SELECT TO authenticated
  USING (public.has_tenant_facility_access(tenant_id, facility_id));

CREATE POLICY orders_insert ON public.orders FOR INSERT TO authenticated
  WITH CHECK (public.has_tenant_facility_access(tenant_id, facility_id));

CREATE POLICY orders_update ON public.orders FOR UPDATE TO authenticated
  USING (public.has_tenant_facility_access(tenant_id, facility_id))
  WITH CHECK (public.has_tenant_facility_access(tenant_id, facility_id));

-- ============================================================================
-- Order Items Policies
-- ============================================================================

CREATE POLICY order_items_select ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders o 
    WHERE o.id = order_items.order_id 
    AND public.has_tenant_facility_access(o.tenant_id, o.facility_id)
  ));

CREATE POLICY order_items_insert ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.orders o 
    WHERE o.id = order_items.order_id 
    AND public.has_tenant_facility_access(o.tenant_id, o.facility_id)
  ));

CREATE POLICY order_items_update ON public.order_items FOR UPDATE TO authenticated
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

-- ============================================================================
-- Register Closings Policies
-- ============================================================================

CREATE POLICY register_closings_select ON public.register_closings FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.register_sessions s 
    WHERE s.id = register_closings.session_id 
    AND public.has_tenant_facility_access(s.tenant_id, s.facility_id)
  ));

CREATE POLICY register_closings_insert ON public.register_closings FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.register_sessions s 
    WHERE s.id = register_closings.session_id 
    AND public.has_tenant_facility_access(s.tenant_id, s.facility_id)
  ));

CREATE POLICY register_closings_update ON public.register_closings FOR UPDATE TO authenticated
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

-- ============================================================================
-- Appointments Policies
-- ============================================================================

CREATE POLICY appointments_select ON public.appointments FOR SELECT TO authenticated
  USING (public.has_tenant_facility_access(tenant_id, facility_id));

CREATE POLICY appointments_insert ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_or_secretary() AND 
    public.has_tenant_facility_access(tenant_id, facility_id)
  );

CREATE POLICY appointments_update ON public.appointments FOR UPDATE TO authenticated
  USING (public.is_admin_or_secretary() AND public.has_tenant_facility_access(tenant_id, facility_id))
  WITH CHECK (public.is_admin_or_secretary() AND public.has_tenant_facility_access(tenant_id, facility_id));

CREATE POLICY appointments_delete ON public.appointments FOR DELETE TO authenticated
  USING (public.is_admin() AND public.has_tenant_facility_access(tenant_id, facility_id));

-- ============================================================================
-- Football Bookings Policies
-- ============================================================================

CREATE POLICY football_select ON public.football_bookings FOR SELECT TO authenticated
  USING (public.has_tenant_facility_access(tenant_id, facility_id));

CREATE POLICY football_insert ON public.football_bookings FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_or_secretary() AND 
    public.has_tenant_facility_access(tenant_id, facility_id)
  );

CREATE POLICY football_update ON public.football_bookings FOR UPDATE TO authenticated
  USING (public.is_admin_or_secretary() AND public.has_tenant_facility_access(tenant_id, facility_id))
  WITH CHECK (public.is_admin_or_secretary() AND public.has_tenant_facility_access(tenant_id, facility_id));

CREATE POLICY football_delete ON public.football_bookings FOR DELETE TO authenticated
  USING (public.is_admin() AND public.has_tenant_facility_access(tenant_id, facility_id));

-- ============================================================================
-- Tenant Settings Policies
-- ============================================================================

CREATE POLICY tenant_settings_select ON public.tenant_settings FOR SELECT TO authenticated
  USING (public.has_tenant_access(tenant_id));

CREATE POLICY tenant_settings_insert ON public.tenant_settings FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND public.has_tenant_access(tenant_id));

CREATE POLICY tenant_settings_update ON public.tenant_settings FOR UPDATE TO authenticated
  USING (public.is_admin() AND public.has_tenant_access(tenant_id))
  WITH CHECK (public.is_admin() AND public.has_tenant_access(tenant_id));

CREATE POLICY tenant_settings_delete ON public.tenant_settings FOR DELETE TO authenticated
  USING (public.is_admin() AND public.has_tenant_access(tenant_id));

-- ============================================================================
-- User Preferences Policies
-- ============================================================================

CREATE POLICY user_preferences_select ON public.user_preferences FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY user_preferences_insert ON public.user_preferences FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY user_preferences_update ON public.user_preferences FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY user_preferences_delete ON public.user_preferences FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

COMMIT;
