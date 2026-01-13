-- Indexes

BEGIN;

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

-- Memberships unique (handles NULL facility_id)
CREATE UNIQUE INDEX memberships_user_tenant_facility_idx 
  ON public.memberships (user_id, tenant_id, COALESCE(facility_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Prevent double-booking for football fields (actual time range overlap)
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_no_overlap 
  EXCLUDE USING gist (
    facility_id WITH =,
    (details->>'field_number') WITH =,
    tstzrange(starts_at, ends_at) WITH &&
  ) WHERE (type = 'football' AND status != 'canceled');

COMMIT;
