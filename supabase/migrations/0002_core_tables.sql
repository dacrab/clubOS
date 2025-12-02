-- ============================================================================
-- ClubOS Database Schema v2.0
-- Migration 2: Core Tables (Users, Tenants, Facilities)
-- ============================================================================

BEGIN;

-- Users table (links to Supabase auth.users)
CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  email text,
  full_name text,
  avatar_url text,
  role public.user_role NOT NULL DEFAULT 'staff',
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_username_unique UNIQUE (username)
);

COMMENT ON TABLE public.users IS 'Application users linked to Supabase auth';
COMMENT ON COLUMN public.users.role IS 'User role: admin has full access, secretary manages bookings, staff handles POS';

-- Tenants (organizations/businesses)
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  logo_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tenants_name_unique UNIQUE (name),
  CONSTRAINT tenants_slug_unique UNIQUE (slug),
  CONSTRAINT tenants_slug_format CHECK (slug ~ '^[a-z0-9-]+$')
);

COMMENT ON TABLE public.tenants IS 'Organizations/businesses using the platform';

-- Tenant members (many-to-many: users <-> tenants)
CREATE TABLE public.tenant_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tenant_members_unique UNIQUE (tenant_id, user_id)
);

COMMENT ON TABLE public.tenant_members IS 'Links users to tenants they belong to';

-- Facilities (physical locations within a tenant)
CREATE TABLE public.facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  phone text,
  email text,
  is_active boolean NOT NULL DEFAULT true,
  timezone text NOT NULL DEFAULT 'Europe/Athens',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.facilities IS 'Physical locations/branches within a tenant';

-- Facility members (many-to-many: users <-> facilities)
CREATE TABLE public.facility_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT facility_members_unique UNIQUE (facility_id, user_id)
);

COMMENT ON TABLE public.facility_members IS 'Links users to facilities they can access';

COMMIT;
