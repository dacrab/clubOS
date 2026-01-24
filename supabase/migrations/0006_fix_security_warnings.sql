-- Extensions and booking constraints

BEGIN;

-- Extensions in dedicated schema
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS btree_gist SCHEMA extensions;

-- Trigram index for customer search
CREATE INDEX idx_bookings_customer_trigram ON public.bookings USING gin (customer_name extensions.gin_trgm_ops);

-- Booking overlap prevention constraints
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
