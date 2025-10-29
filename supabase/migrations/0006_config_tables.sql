-- ClubOS: Configuration Tables (Tenant Settings, User Preferences)
BEGIN;

CREATE TABLE public.tenant_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  facility_id uuid REFERENCES public.facilities(id) ON DELETE CASCADE,
  low_stock_threshold integer NOT NULL DEFAULT 3 CHECK (low_stock_threshold >= 0),
  allow_unlimited_stock boolean NOT NULL DEFAULT true,
  negative_stock_allowed boolean NOT NULL DEFAULT false,
  default_category_sort text NOT NULL DEFAULT 'name' CHECK (default_category_sort IN ('name','custom')),
  products_page_size integer NOT NULL DEFAULT 50 CHECK (products_page_size BETWEEN 10 AND 500),
  image_max_size_mb integer NOT NULL DEFAULT 5 CHECK (image_max_size_mb BETWEEN 1 AND 50),
  coupons_value numeric(10,2) NOT NULL DEFAULT 2.00,
  allow_treats boolean NOT NULL DEFAULT true,
  require_open_register_for_sale boolean NOT NULL DEFAULT true,
  currency_code text NOT NULL DEFAULT 'EUR',
  tax_rate_percent numeric(5,2) NOT NULL DEFAULT 0.00,
  receipt_footer_text text,
  booking_default_duration_min integer NOT NULL DEFAULT 60 CHECK (booking_default_duration_min BETWEEN 10 AND 600),
  football_fields_count integer NOT NULL DEFAULT 2 CHECK (football_fields_count BETWEEN 1 AND 20),
  appointment_buffer_min integer NOT NULL DEFAULT 15 CHECK (appointment_buffer_min BETWEEN 0 AND 120),
  prevent_overlaps boolean NOT NULL DEFAULT true,
  theme_default text NOT NULL DEFAULT 'system' CHECK (theme_default IN ('system','light','dark')),
  default_locale text NOT NULL DEFAULT 'en' CHECK (default_locale IN ('en','el')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (tenant_id, facility_id)
);

CREATE TABLE public.user_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  collapsed_sidebar boolean NOT NULL DEFAULT false,
  dense_table_mode boolean NOT NULL DEFAULT false,
  default_locale text CHECK (default_locale IN ('en','el')),
  theme text CHECK (theme IN ('system','light','dark')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMIT;

