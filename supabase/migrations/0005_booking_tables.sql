-- ============================================================================
-- ClubOS Database Schema v2.0
-- Migration 5: Booking Tables (Appointments, Football Bookings)
-- ============================================================================

BEGIN;

-- Birthday party appointments
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  contact_info text NOT NULL,
  appointment_date timestamptz NOT NULL,
  end_date timestamptz,
  duration_minutes integer NOT NULL DEFAULT 120,
  num_children integer NOT NULL DEFAULT 1,
  num_adults integer NOT NULL DEFAULT 0,
  package_type text,
  total_price numeric(10,2),
  deposit_amount numeric(10,2) DEFAULT 0,
  deposit_paid boolean NOT NULL DEFAULT false,
  status public.booking_status NOT NULL DEFAULT 'confirmed',
  notes text,
  internal_notes text,
  reminder_sent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  cancelled_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  cancelled_at timestamptz,
  cancellation_reason text,
  CONSTRAINT appointments_children_positive CHECK (num_children >= 0),
  CONSTRAINT appointments_adults_positive CHECK (num_adults >= 0),
  CONSTRAINT appointments_duration_positive CHECK (duration_minutes > 0),
  CONSTRAINT appointments_end_after_start CHECK (end_date IS NULL OR end_date > appointment_date)
);

COMMENT ON TABLE public.appointments IS 'Birthday party and event bookings';
COMMENT ON COLUMN public.appointments.internal_notes IS 'Staff-only notes not visible to customers';
COMMENT ON COLUMN public.appointments.package_type IS 'Type of party package selected';

-- Football field bookings
CREATE TABLE public.football_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  contact_info text NOT NULL,
  booking_datetime timestamptz NOT NULL,
  end_datetime timestamptz,
  duration_minutes integer NOT NULL DEFAULT 60,
  field_number integer NOT NULL,
  num_players integer NOT NULL DEFAULT 10,
  total_price numeric(10,2),
  deposit_amount numeric(10,2) DEFAULT 0,
  deposit_paid boolean NOT NULL DEFAULT false,
  is_recurring boolean NOT NULL DEFAULT false,
  recurring_pattern text,
  status public.booking_status NOT NULL DEFAULT 'confirmed',
  notes text,
  internal_notes text,
  reminder_sent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  cancelled_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  cancelled_at timestamptz,
  cancellation_reason text,
  CONSTRAINT football_field_positive CHECK (field_number >= 1),
  CONSTRAINT football_players_positive CHECK (num_players >= 1),
  CONSTRAINT football_duration_positive CHECK (duration_minutes > 0),
  CONSTRAINT football_end_after_start CHECK (end_datetime IS NULL OR end_datetime > booking_datetime)
);

COMMENT ON TABLE public.football_bookings IS 'Football field reservations';
COMMENT ON COLUMN public.football_bookings.recurring_pattern IS 'JSON pattern for recurring bookings (weekly, etc)';

-- Unique constraint for double-booking prevention
CREATE UNIQUE INDEX idx_football_no_overlap 
  ON public.football_bookings (facility_id, field_number, booking_datetime) 
  WHERE status NOT IN ('cancelled');

COMMIT;
