-- ClubOS: RLS Policies
BEGIN;

-- Enable RLS on all tables
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

-- Users policies
CREATE POLICY users_read ON public.users FOR SELECT TO authenticated
  USING (
    public.has_shared_tenant(public.users.id) OR public.is_admin()
  );

CREATE POLICY users_update ON public.users FOR UPDATE TO authenticated 
  USING (id = (select auth.uid()) OR (public.is_admin() AND public.has_shared_tenant(public.users.id)))
  WITH CHECK (id = (select auth.uid()) OR (public.is_admin() AND public.has_shared_tenant(public.users.id)));

-- Tenants policies
CREATE POLICY tenants_read ON public.tenants FOR SELECT TO authenticated 
  USING (public.has_tenant_access(id));

-- Tenant members policies
CREATE POLICY tenant_members_select ON public.tenant_members FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid()) OR (
      public.is_admin() AND tenant_id IN (
        SELECT tenant_id FROM public.tenant_members WHERE user_id = (select auth.uid())
      )
    )
  );

CREATE POLICY tenant_members_admin_insert ON public.tenant_members FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin() AND tenant_id IN (
      SELECT tenant_id FROM public.tenant_members WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY tenant_members_admin_update ON public.tenant_members FOR UPDATE TO authenticated
  USING (
    public.is_admin() AND tenant_id IN (
      SELECT tenant_id FROM public.tenant_members WHERE user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    public.is_admin() AND tenant_id IN (
      SELECT tenant_id FROM public.tenant_members WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY tenant_members_admin_delete ON public.tenant_members FOR DELETE TO authenticated
  USING (
    public.is_admin() AND tenant_id IN (
      SELECT tenant_id FROM public.tenant_members WHERE user_id = (select auth.uid())
    )
  );

-- Facilities policies
CREATE POLICY facilities_read ON public.facilities FOR SELECT TO authenticated 
  USING (public.has_tenant_access(tenant_id));

-- Facility members policies
CREATE POLICY facility_members_select ON public.facility_members FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid()) OR (
      public.is_admin() AND public.has_facility_in_user_tenants(facility_members.facility_id)
    )
  );

CREATE POLICY facility_members_admin_insert ON public.facility_members FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin() AND public.has_facility_in_user_tenants(facility_members.facility_id)
  );

CREATE POLICY facility_members_admin_update ON public.facility_members FOR UPDATE TO authenticated
  USING (
    public.is_admin() AND public.has_facility_in_user_tenants(facility_members.facility_id)
  )
  WITH CHECK (
    public.is_admin() AND public.has_facility_in_user_tenants(facility_members.facility_id)
  );

CREATE POLICY facility_members_admin_delete ON public.facility_members FOR DELETE TO authenticated
  USING (
    public.is_admin() AND public.has_facility_in_user_tenants(facility_members.facility_id)
  );

-- Business tables policies
CREATE POLICY categories_all ON public.categories FOR ALL TO authenticated
  USING (public.has_tenant_facility_access(tenant_id, facility_id))
  WITH CHECK (public.has_tenant_facility_access(tenant_id, facility_id));

CREATE POLICY products_all ON public.products FOR ALL TO authenticated
  USING (public.has_tenant_facility_access(tenant_id, facility_id))
  WITH CHECK (public.has_tenant_facility_access(tenant_id, facility_id));

-- Transaction tables policies
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

-- Booking tables policies
CREATE POLICY appointments_all ON public.appointments FOR ALL TO authenticated
  USING (public.has_tenant_facility_access(tenant_id, facility_id))
  WITH CHECK (public.has_tenant_facility_access(tenant_id, facility_id));

CREATE POLICY football_bookings_all ON public.football_bookings FOR ALL TO authenticated
  USING (public.has_tenant_facility_access(tenant_id, facility_id))
  WITH CHECK (public.has_tenant_facility_access(tenant_id, facility_id));

-- Configuration tables policies
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

COMMIT;

