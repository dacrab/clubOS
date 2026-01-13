-- ClubOS Schema

BEGIN;

-- Types
CREATE TYPE public.user_role AS ENUM ('owner', 'admin', 'manager', 'staff');
CREATE TYPE public.booking_type AS ENUM ('birthday', 'football', 'event', 'other');
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed', 'no_show');
CREATE TYPE public.subscription_status AS ENUM ('trialing', 'active', 'canceled', 'past_due', 'unpaid', 'paused');

-- Tenants
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  settings jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Subscriptions
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text UNIQUE,
  status public.subscription_status NOT NULL DEFAULT 'trialing',
  plan_name text,
  current_period_end timestamptz,
  trial_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Facilities
CREATE TABLE public.facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  phone text,
  email text,
  timezone text NOT NULL DEFAULT 'Europe/Athens',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);

-- Users (links to auth.users)
CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Memberships
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

-- Categories
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (id != parent_id),
  UNIQUE (facility_id, name)
);

-- Products
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  stock_quantity integer NOT NULL DEFAULT 0,
  track_inventory boolean NOT NULL DEFAULT true,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  UNIQUE (facility_id, name)
);

-- Register Sessions
CREATE TABLE public.register_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  opened_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  closed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  opening_cash numeric(10,2) NOT NULL DEFAULT 0 CHECK (opening_cash >= 0),
  closing_cash numeric(10,2) CHECK (closing_cash IS NULL OR closing_cash >= 0),
  expected_cash numeric(10,2),
  notes text,
  summary jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (closed_at IS NULL OR closed_at > opened_at)
);

-- Orders
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.register_sessions(id) ON DELETE SET NULL,
  subtotal numeric(10,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  coupon_count integer NOT NULL DEFAULT 0 CHECK (coupon_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT
);

-- Order Items
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
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Bookings
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  type public.booking_type NOT NULL,
  status public.booking_status NOT NULL DEFAULT 'confirmed',
  customer_name text NOT NULL,
  customer_phone text,
  customer_email text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  details jsonb NOT NULL DEFAULT '{}',
  total_price numeric(10,2),
  deposit_amount numeric(10,2) DEFAULT 0,
  deposit_paid boolean NOT NULL DEFAULT false,
  notes text,
  internal_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  CHECK (ends_at > starts_at)
);

-- Indexes
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

-- Prevent double-booking for football fields
CREATE UNIQUE INDEX idx_bookings_no_overlap 
  ON public.bookings (facility_id, (details->>'field_number'), starts_at) 
  WHERE type = 'football' AND status NOT IN ('cancelled');

-- Keep-alive table for cron health checks
CREATE TABLE public."keep-alive" (
  name text PRIMARY KEY
);

COMMIT;
