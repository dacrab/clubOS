-- ============================================================================
-- ClubOS Database Schema v2.0
-- Migration 6: Configuration Tables (Settings, Preferences)
-- ============================================================================

BEGIN;

-- Tenant settings (business configuration)
CREATE TABLE public.tenant_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  facility_id uuid REFERENCES public.facilities(id) ON DELETE CASCADE,
  
  -- Inventory settings
  low_stock_threshold integer NOT NULL DEFAULT 3,
  allow_unlimited_stock boolean NOT NULL DEFAULT true,
  negative_stock_allowed boolean NOT NULL DEFAULT false,
  default_category_sort text NOT NULL DEFAULT 'name',
  products_page_size integer NOT NULL DEFAULT 50,
  image_max_size_mb integer NOT NULL DEFAULT 5,
  
  -- Sales settings
  coupons_value numeric(10,2) NOT NULL DEFAULT 2.00,
  allow_treats boolean NOT NULL DEFAULT true,
  require_open_register_for_sale boolean NOT NULL DEFAULT true,
  currency_code text NOT NULL DEFAULT 'EUR',
  tax_rate_percent numeric(5,2) NOT NULL DEFAULT 0.00,
  tax_inclusive boolean NOT NULL DEFAULT true,
  receipt_header_text text,
  receipt_footer_text text,
  print_receipt_by_default boolean NOT NULL DEFAULT false,
  
  -- Booking settings
  booking_default_duration_min integer NOT NULL DEFAULT 120,
  football_default_duration_min integer NOT NULL DEFAULT 60,
  football_fields_count integer NOT NULL DEFAULT 2,
  appointment_buffer_min integer NOT NULL DEFAULT 15,
  prevent_overlaps boolean NOT NULL DEFAULT true,
  allow_online_bookings boolean NOT NULL DEFAULT false,
  require_deposit boolean NOT NULL DEFAULT false,
  default_deposit_percent numeric(5,2) DEFAULT 20.00,
  send_booking_reminders boolean NOT NULL DEFAULT false,
  reminder_hours_before integer DEFAULT 24,
  
  -- Appearance settings
  theme_default text NOT NULL DEFAULT 'system',
  default_locale text NOT NULL DEFAULT 'en',
  date_format text NOT NULL DEFAULT 'DD/MM/YYYY',
  time_format text NOT NULL DEFAULT '24h',
  first_day_of_week integer NOT NULL DEFAULT 1,
  
  -- Business hours (JSON structure)
  business_hours jsonb DEFAULT '{"mon":{"open":"09:00","close":"21:00"},"tue":{"open":"09:00","close":"21:00"},"wed":{"open":"09:00","close":"21:00"},"thu":{"open":"09:00","close":"21:00"},"fri":{"open":"09:00","close":"21:00"},"sat":{"open":"10:00","close":"22:00"},"sun":{"open":"10:00","close":"20:00"}}',
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT settings_low_stock_positive CHECK (low_stock_threshold >= 0),
  CONSTRAINT settings_page_size_range CHECK (products_page_size BETWEEN 10 AND 500),
  CONSTRAINT settings_image_size_range CHECK (image_max_size_mb BETWEEN 1 AND 50),
  CONSTRAINT settings_tax_rate_range CHECK (tax_rate_percent BETWEEN 0 AND 100),
  CONSTRAINT settings_booking_duration_range CHECK (booking_default_duration_min BETWEEN 10 AND 600),
  CONSTRAINT settings_football_duration_range CHECK (football_default_duration_min BETWEEN 10 AND 180),
  CONSTRAINT settings_fields_count_range CHECK (football_fields_count BETWEEN 1 AND 20),
  CONSTRAINT settings_buffer_range CHECK (appointment_buffer_min BETWEEN 0 AND 120),
  CONSTRAINT settings_theme_valid CHECK (theme_default IN ('system', 'light', 'dark')),
  CONSTRAINT settings_locale_valid CHECK (default_locale IN ('en', 'el')),
  CONSTRAINT settings_date_format_valid CHECK (date_format IN ('DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD.MM.YYYY', 'DD-MM-YYYY')),
  CONSTRAINT settings_time_format_valid CHECK (time_format IN ('12h', '24h')),
  CONSTRAINT settings_first_day_range CHECK (first_day_of_week BETWEEN 0 AND 6)
);

COMMENT ON TABLE public.tenant_settings IS 'Business configuration settings per tenant/facility';
COMMENT ON COLUMN public.tenant_settings.facility_id IS 'NULL means tenant-wide defaults';
COMMENT ON COLUMN public.tenant_settings.tax_inclusive IS 'Whether prices include tax or tax is added';
COMMENT ON COLUMN public.tenant_settings.first_day_of_week IS '0=Sunday, 1=Monday, etc';

-- Unique constraint: one default setting per tenant, one per facility
CREATE UNIQUE INDEX idx_tenant_settings_default 
  ON public.tenant_settings(tenant_id) 
  WHERE facility_id IS NULL;

CREATE UNIQUE INDEX idx_tenant_settings_facility 
  ON public.tenant_settings(tenant_id, facility_id) 
  WHERE facility_id IS NOT NULL;

-- User preferences (per-user settings)
CREATE TABLE public.user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- UI preferences
  theme text DEFAULT 'system',
  locale text DEFAULT 'en',
  collapsed_sidebar boolean NOT NULL DEFAULT false,
  dense_table_mode boolean NOT NULL DEFAULT false,
  items_per_page integer DEFAULT 25,
  
  -- Notification preferences
  email_notifications boolean NOT NULL DEFAULT true,
  push_notifications boolean NOT NULL DEFAULT false,
  
  -- Dashboard preferences
  dashboard_layout jsonb,
  pinned_products uuid[],
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT user_preferences_unique UNIQUE (user_id),
  CONSTRAINT user_preferences_theme_valid CHECK (theme IS NULL OR theme IN ('system', 'light', 'dark')),
  CONSTRAINT user_preferences_locale_valid CHECK (locale IS NULL OR locale IN ('en', 'el')),
  CONSTRAINT user_preferences_items_range CHECK (items_per_page IS NULL OR items_per_page BETWEEN 10 AND 100)
);

COMMENT ON TABLE public.user_preferences IS 'Individual user preferences';
COMMENT ON COLUMN public.user_preferences.dashboard_layout IS 'Custom dashboard widget arrangement';
COMMENT ON COLUMN public.user_preferences.pinned_products IS 'Quick-access products for POS';

COMMIT;
