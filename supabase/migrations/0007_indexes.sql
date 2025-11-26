-- ============================================================================
-- ClubOS Database Schema v2.0
-- Migration 7: Indexes for Performance
-- ============================================================================

BEGIN;

-- ============================================================================
-- Foreign Key Indexes (critical for JOIN performance)
-- ============================================================================

-- Users and membership
CREATE INDEX idx_tenant_members_tenant ON public.tenant_members(tenant_id);
CREATE INDEX idx_tenant_members_user ON public.tenant_members(user_id);
CREATE INDEX idx_facility_members_facility ON public.facility_members(facility_id);
CREATE INDEX idx_facility_members_user ON public.facility_members(user_id);

-- Facilities
CREATE INDEX idx_facilities_tenant ON public.facilities(tenant_id);
CREATE INDEX idx_facilities_active ON public.facilities(tenant_id) WHERE is_active = true;

-- Categories
CREATE INDEX idx_categories_tenant ON public.categories(tenant_id);
CREATE INDEX idx_categories_facility ON public.categories(facility_id);
CREATE INDEX idx_categories_parent ON public.categories(parent_id);
CREATE INDEX idx_categories_active ON public.categories(facility_id) WHERE is_active = true;

-- Products
CREATE INDEX idx_products_tenant ON public.products(tenant_id);
CREATE INDEX idx_products_facility ON public.products(facility_id);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_available ON public.products(facility_id) WHERE is_available = true;
CREATE INDEX idx_products_low_stock ON public.products(facility_id, stock_quantity) 
  WHERE track_inventory = true AND stock_quantity >= 0;

-- Register sessions
CREATE INDEX idx_sessions_tenant ON public.register_sessions(tenant_id);
CREATE INDEX idx_sessions_facility ON public.register_sessions(facility_id);
CREATE INDEX idx_sessions_opened_by ON public.register_sessions(opened_by);
CREATE INDEX idx_sessions_open ON public.register_sessions(facility_id) WHERE closed_at IS NULL;
CREATE INDEX idx_sessions_date ON public.register_sessions(facility_id, opened_at DESC);

-- Orders
CREATE INDEX idx_orders_tenant ON public.orders(tenant_id);
CREATE INDEX idx_orders_facility ON public.orders(facility_id);
CREATE INDEX idx_orders_session ON public.orders(session_id);
CREATE INDEX idx_orders_created_by ON public.orders(created_by);
CREATE INDEX idx_orders_date ON public.orders(facility_id, created_at DESC);
CREATE INDEX idx_orders_status ON public.orders(facility_id, status);

-- Order items
CREATE INDEX idx_order_items_order ON public.order_items(order_id);
CREATE INDEX idx_order_items_product ON public.order_items(product_id);
CREATE INDEX idx_order_items_deleted_by ON public.order_items(deleted_by);
CREATE INDEX idx_order_items_active ON public.order_items(order_id) WHERE is_deleted = false;

-- Register closings
CREATE INDEX idx_register_closings_session ON public.register_closings(session_id);

-- Appointments
CREATE INDEX idx_appointments_tenant ON public.appointments(tenant_id);
CREATE INDEX idx_appointments_facility ON public.appointments(facility_id);
CREATE INDEX idx_appointments_created_by ON public.appointments(created_by);
CREATE INDEX idx_appointments_date ON public.appointments(facility_id, appointment_date);
CREATE INDEX idx_appointments_status ON public.appointments(facility_id, status);
CREATE INDEX idx_appointments_upcoming ON public.appointments(facility_id, appointment_date) 
  WHERE status IN ('pending', 'confirmed');

-- Football bookings
CREATE INDEX idx_football_tenant ON public.football_bookings(tenant_id);
CREATE INDEX idx_football_facility ON public.football_bookings(facility_id);
CREATE INDEX idx_football_created_by ON public.football_bookings(created_by);
CREATE INDEX idx_football_date ON public.football_bookings(facility_id, booking_datetime);
CREATE INDEX idx_football_field ON public.football_bookings(facility_id, field_number, booking_datetime);
CREATE INDEX idx_football_status ON public.football_bookings(facility_id, status);
CREATE INDEX idx_football_upcoming ON public.football_bookings(facility_id, booking_datetime) 
  WHERE status IN ('pending', 'confirmed');

-- Settings (unique indexes already created in 0006)
-- Regular index for tenant_id lookup
CREATE INDEX idx_tenant_settings_tenant ON public.tenant_settings(tenant_id);

-- ============================================================================
-- Unique Indexes for Business Rules
-- ============================================================================

-- Unique facility names per tenant
CREATE UNIQUE INDEX idx_facilities_name_unique 
  ON public.facilities(tenant_id, lower(name));

-- Unique category names per facility
CREATE UNIQUE INDEX idx_categories_name_unique 
  ON public.categories(facility_id, lower(name));

-- Unique product names per facility
CREATE UNIQUE INDEX idx_products_name_unique 
  ON public.products(facility_id, lower(name));

-- Unique SKU per facility (if provided)
CREATE UNIQUE INDEX idx_products_sku_unique 
  ON public.products(facility_id, sku) 
  WHERE sku IS NOT NULL;

-- Unique barcode per facility (if provided)
CREATE UNIQUE INDEX idx_products_barcode_unique 
  ON public.products(facility_id, barcode) 
  WHERE barcode IS NOT NULL;

-- ============================================================================
-- Full-text Search Indexes
-- ============================================================================

-- Product search
CREATE INDEX idx_products_search 
  ON public.products USING gin(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));

-- Customer search (appointments)
CREATE INDEX idx_appointments_customer_search 
  ON public.appointments USING gin(to_tsvector('english', coalesce(customer_name, '') || ' ' || coalesce(contact_info, '')));

-- Customer search (football)
CREATE INDEX idx_football_customer_search 
  ON public.football_bookings USING gin(to_tsvector('english', coalesce(customer_name, '') || ' ' || coalesce(contact_info, '')));

COMMIT;
