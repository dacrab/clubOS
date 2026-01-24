-- Indexes, Extensions & Constraints

BEGIN;

-- Extensions
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS btree_gist SCHEMA extensions;

-- Tenants
CREATE INDEX idx_tenants_settings ON public.tenants USING gin(settings);

-- Subscriptions
CREATE INDEX idx_subscriptions_active ON public.subscriptions(tenant_id) WHERE status = 'active';

-- Facilities
CREATE INDEX idx_facilities_tenant ON public.facilities(tenant_id);

-- Memberships
CREATE INDEX idx_memberships_user ON public.memberships(user_id);
CREATE INDEX idx_memberships_tenant ON public.memberships(tenant_id);
CREATE INDEX idx_memberships_primary ON public.memberships(user_id) WHERE is_primary = true;
CREATE UNIQUE INDEX memberships_user_tenant_facility_idx 
  ON public.memberships(user_id, tenant_id, COALESCE(facility_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Categories
CREATE INDEX idx_categories_facility ON public.categories(facility_id);

-- Products
CREATE INDEX idx_products_facility ON public.products(facility_id);
CREATE INDEX idx_products_category ON public.products(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX idx_products_facility_stock ON public.products(facility_id, stock_quantity) WHERE track_inventory = true;
CREATE INDEX idx_products_available ON public.products(facility_id, name) WHERE stock_quantity > 0;
CREATE INDEX idx_products_search ON public.products USING gin(search_vector);

-- Orders
CREATE INDEX idx_orders_facility_created ON public.orders(facility_id, created_at DESC);
CREATE INDEX idx_orders_session ON public.orders(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_orders_created_by ON public.orders(created_by);

-- Order Items
CREATE INDEX idx_order_items_order ON public.order_items(order_id);

-- Bookings
CREATE INDEX idx_bookings_facility_starts ON public.bookings(facility_id, starts_at);
CREATE INDEX idx_bookings_status_type ON public.bookings(status, type);
CREATE INDEX idx_bookings_active ON public.bookings(facility_id, starts_at) WHERE status IN ('confirmed', 'pending');
CREATE INDEX idx_bookings_details ON public.bookings USING gin(details);
CREATE INDEX idx_bookings_customer_trigram ON public.bookings USING gin (customer_name extensions.gin_trgm_ops);

-- Booking overlap prevention
ALTER TABLE public.bookings ADD CONSTRAINT bookings_no_overlap 
  EXCLUDE USING gist (
    facility_id WITH =,
    (details->>'field_number') WITH =,
    tstzrange(starts_at, ends_at) WITH &&
  ) WHERE (type = 'football' AND status != 'canceled');

ALTER TABLE public.bookings ADD CONSTRAINT no_overlapping_bookings
  EXCLUDE USING gist (
    facility_id WITH =,
    tstzrange(starts_at, ends_at) WITH &&
  ) WHERE (status NOT IN ('canceled', 'no_show'));

-- Register Sessions
CREATE INDEX idx_register_sessions_facility ON public.register_sessions(facility_id);
CREATE INDEX idx_register_sessions_active ON public.register_sessions(facility_id, opened_at) WHERE closed_at IS NULL;

-- Audit Log
CREATE INDEX idx_audit_log_record ON public.audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_changed_at ON public.audit_log(changed_at DESC);

COMMIT;
