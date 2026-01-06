-- ============================================================================
-- ClubOS Database Schema v3.0 - Optimized & Consolidated
-- ============================================================================

BEGIN;

-- ===================
-- EXTENSIONS & TYPES
-- ===================

-- Note: gen_random_uuid() is built into Postgres 13+, no extension needed

CREATE TYPE public.user_role AS ENUM ('owner', 'admin', 'manager', 'staff');
CREATE TYPE public.booking_type AS ENUM ('birthday', 'football', 'event', 'other');
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed', 'no_show');
CREATE TYPE public.order_status AS ENUM ('pending', 'completed', 'refunded', 'voided');
CREATE TYPE public.payment_method AS ENUM ('cash', 'card', 'mixed', 'coupon', 'other');
CREATE TYPE public.subscription_status AS ENUM ('trialing', 'active', 'canceled', 'past_due', 'unpaid', 'paused');

-- ===================
-- CORE TABLES
-- ===================

-- Tenants (organizations/businesses)
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  logo_url text,
  settings jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Subscriptions (Stripe integration - one per tenant)
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text UNIQUE,
  stripe_price_id text,
  status public.subscription_status NOT NULL DEFAULT 'trialing',
  plan_name text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Facilities (physical locations within a tenant)
CREATE TABLE public.facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  phone text,
  email text,
  timezone text NOT NULL DEFAULT 'Europe/Athens',
  settings jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);

-- Users (links to Supabase auth.users)
CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  preferences jsonb NOT NULL DEFAULT '{"theme": "system", "locale": "en"}',
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unified memberships (replaces tenant_members + facility_members)
CREATE TABLE public.memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  facility_id uuid REFERENCES public.facilities(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'staff',
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tenant_id, facility_id)
);

COMMENT ON TABLE public.memberships IS 'User access: facility_id NULL = tenant-wide access, otherwise facility-specific';

-- ===================
-- BUSINESS TABLES
-- ===================

-- Categories (hierarchical, facility-scoped)
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  color text,
  icon text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (id != parent_id),
  UNIQUE (facility_id, name)
);

-- Products (facility-scoped)
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  sku text,
  barcode text,
  price numeric(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  cost_price numeric(10,2) CHECK (cost_price IS NULL OR cost_price >= 0),
  stock_quantity integer NOT NULL DEFAULT 0,
  track_inventory boolean NOT NULL DEFAULT true,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  UNIQUE (facility_id, name)
);

-- ===================
-- TRANSACTION TABLES
-- ===================

-- Register sessions (cash register cycles)
CREATE TABLE public.register_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  opened_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  closed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  opening_cash numeric(10,2) NOT NULL DEFAULT 0 CHECK (opening_cash >= 0),
  closing_cash numeric(10,2),
  expected_cash numeric(10,2),
  notes text,
  summary jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (closed_at IS NULL OR closed_at > opened_at)
);

COMMENT ON COLUMN public.register_sessions.summary IS 'JSON summary computed at close: orders_count, totals by payment method, etc.';

-- Orders (sales transactions)
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.register_sessions(id) ON DELETE SET NULL,
  order_number serial,
  status public.order_status NOT NULL DEFAULT 'completed',
  payment_method public.payment_method NOT NULL DEFAULT 'cash',
  subtotal numeric(10,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  tax_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  discount_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  coupon_count integer NOT NULL DEFAULT 0 CHECK (coupon_count >= 0),
  customer_name text,
  notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT
);

-- Order items
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price numeric(10,2) NOT NULL CHECK (unit_price >= 0),
  line_total numeric(10,2) NOT NULL,
  is_treat boolean NOT NULL DEFAULT false,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  deleted_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===================
-- BOOKING TABLES (Unified)
-- ===================

-- Single bookings table for all booking types
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  type public.booking_type NOT NULL,
  status public.booking_status NOT NULL DEFAULT 'confirmed',
  
  -- Customer info
  customer_name text NOT NULL,
  customer_phone text,
  customer_email text,
  
  -- Timing
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  duration_minutes integer GENERATED ALWAYS AS (EXTRACT(EPOCH FROM (ends_at - starts_at)) / 60) STORED,
  
  -- Type-specific data (flexible)
  details jsonb NOT NULL DEFAULT '{}',
  
  -- Pricing
  total_price numeric(10,2),
  deposit_amount numeric(10,2) DEFAULT 0,
  deposit_paid boolean NOT NULL DEFAULT false,
  
  -- Notes
  notes text,
  internal_notes text,
  
  -- Tracking
  reminder_sent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  cancelled_at timestamptz,
  cancelled_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  cancellation_reason text,
  
  CHECK (ends_at > starts_at)
);

COMMENT ON COLUMN public.bookings.details IS 'Type-specific data: {field_number, num_players} for football, {num_children, num_adults, package} for birthday, etc.';

-- ===================
-- INDEXES
-- ===================

-- Facilities
CREATE INDEX idx_facilities_tenant ON public.facilities(tenant_id);

-- Memberships
CREATE INDEX idx_memberships_user ON public.memberships(user_id);
CREATE INDEX idx_memberships_tenant ON public.memberships(tenant_id);
CREATE INDEX idx_memberships_facility ON public.memberships(facility_id) WHERE facility_id IS NOT NULL;
CREATE INDEX idx_memberships_primary ON public.memberships(user_id) WHERE is_primary = true;

-- Products & Categories
CREATE INDEX idx_categories_facility ON public.categories(facility_id);
CREATE INDEX idx_products_facility ON public.products(facility_id);
CREATE INDEX idx_products_category ON public.products(category_id) WHERE category_id IS NOT NULL;

-- Orders
CREATE INDEX idx_orders_facility ON public.orders(facility_id);
CREATE INDEX idx_orders_session ON public.orders(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX idx_order_items_order ON public.order_items(order_id);

-- Bookings
CREATE INDEX idx_bookings_facility ON public.bookings(facility_id);
CREATE INDEX idx_bookings_type ON public.bookings(type);
CREATE INDEX idx_bookings_starts_at ON public.bookings(starts_at);
CREATE INDEX idx_bookings_status ON public.bookings(status) WHERE status NOT IN ('cancelled', 'completed');

-- Subscriptions
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);

-- Users
CREATE INDEX idx_users_email ON public.users(email) WHERE email IS NOT NULL;

-- Prevent double-booking for football fields
CREATE UNIQUE INDEX idx_bookings_no_football_overlap 
  ON public.bookings (facility_id, (details->>'field_number'), starts_at) 
  WHERE type = 'football' AND status NOT IN ('cancelled');

COMMIT;
