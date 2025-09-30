-- Extend settings and add composite indexes for common queries
BEGIN;

-- Extend tenant_settings
ALTER TABLE public.tenant_settings
  ADD COLUMN IF NOT EXISTS allow_unlimited_stock boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS negative_stock_allowed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_category_sort text NOT NULL DEFAULT 'name' CHECK (default_category_sort IN ('name','custom')),
  ADD COLUMN IF NOT EXISTS products_page_size integer NOT NULL DEFAULT 50 CHECK (products_page_size BETWEEN 10 AND 500),
  ADD COLUMN IF NOT EXISTS image_max_size_mb integer NOT NULL DEFAULT 5 CHECK (image_max_size_mb BETWEEN 1 AND 50),
  ADD COLUMN IF NOT EXISTS coupons_value numeric(10,2) NOT NULL DEFAULT 2.00,
  ADD COLUMN IF NOT EXISTS allow_treats boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS require_open_register_for_sale boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS currency_code text NOT NULL DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS tax_rate_percent numeric(5,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS receipt_footer_text text,
  ADD COLUMN IF NOT EXISTS booking_default_duration_min integer NOT NULL DEFAULT 60 CHECK (booking_default_duration_min BETWEEN 10 AND 600),
  ADD COLUMN IF NOT EXISTS football_fields_count integer NOT NULL DEFAULT 2 CHECK (football_fields_count BETWEEN 1 AND 20),
  ADD COLUMN IF NOT EXISTS appointment_buffer_min integer NOT NULL DEFAULT 15 CHECK (appointment_buffer_min BETWEEN 0 AND 120),
  ADD COLUMN IF NOT EXISTS prevent_overlaps boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS theme_default text NOT NULL DEFAULT 'system' CHECK (theme_default IN ('system','light','dark')),
  ADD COLUMN IF NOT EXISTS default_locale text NOT NULL DEFAULT 'en' CHECK (default_locale IN ('en','el'));

-- Extend user_preferences
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS dense_table_mode boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_locale text CHECK (default_locale IN ('en','el')),
  ADD COLUMN IF NOT EXISTS theme text CHECK (theme IN ('system','light','dark'));

-- Composite indexes for filter+sort
CREATE INDEX IF NOT EXISTS idx_products_tenant_facility_name ON public.products(tenant_id, facility_id, lower(name));
CREATE INDEX IF NOT EXISTS idx_categories_tenant_facility_name ON public.categories(tenant_id, facility_id, lower(name));
CREATE INDEX IF NOT EXISTS idx_orders_tenant_facility_created_at ON public.orders(tenant_id, facility_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_tenant_facility_opened_at ON public.register_sessions(tenant_id, facility_id, opened_at DESC);

COMMIT;


