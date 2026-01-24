-- Fix Supabase linter security warnings
-- Addresses: extension_in_public

BEGIN;

-- ============================================================================
-- Move extensions from public to extensions schema
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS extensions;

-- Drop dependent index before moving pg_trgm
DROP INDEX IF EXISTS public.idx_bookings_customer_trigram;

-- Move pg_trgm to extensions schema
DROP EXTENSION IF EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;

-- Recreate the trigram index
CREATE INDEX idx_bookings_customer_trigram ON public.bookings USING gin (customer_name extensions.gin_trgm_ops);

-- Drop constraints that depend on btree_gist
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_no_overlap;
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS no_overlapping_bookings;

-- Move btree_gist to extensions schema
DROP EXTENSION IF EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS btree_gist SCHEMA extensions;

-- Recreate exclusion constraints
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

COMMIT;
