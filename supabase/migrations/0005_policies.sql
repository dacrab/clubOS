-- RLS Policies

BEGIN;

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

-- Keep Alive
CREATE POLICY keep_alive_all ON public.keep_alive FOR ALL USING ((SELECT auth.role()) = 'service_role');

COMMIT;
