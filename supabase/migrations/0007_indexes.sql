-- ClubOS: Indexes
BEGIN;

-- Query-critical indexes
CREATE INDEX idx_categories_parent ON public.categories(parent_id);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_orders_session ON public.orders(session_id);
CREATE INDEX idx_order_items_order ON public.order_items(order_id);
CREATE INDEX idx_facilities_tenant ON public.facilities(tenant_id);
CREATE INDEX idx_tenant_members_user ON public.tenant_members(user_id);
CREATE INDEX idx_facility_members_user ON public.facility_members(user_id);
CREATE INDEX idx_sessions_tenant_facility ON public.register_sessions(tenant_id, facility_id);
CREATE INDEX idx_orders_tenant_facility ON public.orders(tenant_id, facility_id);
CREATE INDEX idx_appointments_tenant_facility ON public.appointments(tenant_id, facility_id);
CREATE INDEX idx_football_tenant_facility ON public.football_bookings(tenant_id, facility_id);

-- Unique indexes for name constraints
CREATE UNIQUE INDEX idx_facilities_name_per_tenant ON public.facilities(tenant_id, lower(name));
CREATE UNIQUE INDEX idx_categories_name_per_tenant_facility ON public.categories(tenant_id, facility_id, lower(name));
CREATE UNIQUE INDEX idx_products_name_per_tenant_facility ON public.products(tenant_id, facility_id, lower(name));
CREATE UNIQUE INDEX idx_tenant_settings_default_per_tenant ON public.tenant_settings(tenant_id) WHERE facility_id IS NULL;

-- Foreign key covering indexes
CREATE INDEX idx_appointments_created_by ON public.appointments(created_by);
CREATE INDEX idx_appointments_facility_id ON public.appointments(facility_id);
CREATE INDEX idx_appointments_tenant_id ON public.appointments(tenant_id);
CREATE INDEX idx_categories_created_by ON public.categories(created_by);
CREATE INDEX idx_categories_facility_id ON public.categories(facility_id);
CREATE INDEX idx_categories_tenant_id ON public.categories(tenant_id);
CREATE INDEX idx_facility_members_facility_id ON public.facility_members(facility_id);
CREATE INDEX idx_football_created_by ON public.football_bookings(created_by);
CREATE INDEX idx_football_facility_id ON public.football_bookings(facility_id);
CREATE INDEX idx_football_tenant_id ON public.football_bookings(tenant_id);
CREATE INDEX idx_order_items_deleted_by ON public.order_items(deleted_by);
CREATE INDEX idx_order_items_product_id ON public.order_items(product_id);
CREATE INDEX idx_orders_created_by ON public.orders(created_by);
CREATE INDEX idx_orders_facility_id ON public.orders(facility_id);
CREATE INDEX idx_orders_tenant_id ON public.orders(tenant_id);
CREATE INDEX idx_products_created_by ON public.products(created_by);
CREATE INDEX idx_products_facility_id ON public.products(facility_id);
CREATE INDEX idx_products_tenant_id ON public.products(tenant_id);
CREATE INDEX idx_register_sessions_opened_by ON public.register_sessions(opened_by);
CREATE INDEX idx_register_sessions_facility_id ON public.register_sessions(facility_id);
CREATE INDEX idx_register_sessions_tenant_id ON public.register_sessions(tenant_id);
CREATE INDEX idx_tenant_members_tenant_id ON public.tenant_members(tenant_id);
CREATE INDEX idx_tenant_settings_facility_id ON public.tenant_settings(facility_id);

COMMIT;

