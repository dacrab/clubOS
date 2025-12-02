-- ============================================================================
-- ClubOS Database Schema v2.0
-- Migration 3: Business Tables (Categories, Products)
-- ============================================================================

BEGIN;

-- Product categories (hierarchical)
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
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
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT categories_no_self_parent CHECK (id != parent_id)
);

COMMENT ON TABLE public.categories IS 'Product categories with optional hierarchy';
COMMENT ON COLUMN public.categories.color IS 'Hex color code for UI display';
COMMENT ON COLUMN public.categories.icon IS 'Icon identifier for UI display';

-- Products
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  sku text,
  barcode text,
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  cost_price numeric(10,2),
  stock_quantity integer NOT NULL DEFAULT 0,
  min_stock_level integer DEFAULT 0,
  max_stock_level integer,
  track_inventory boolean NOT NULL DEFAULT true,
  allow_negative_stock boolean NOT NULL DEFAULT false,
  is_available boolean NOT NULL DEFAULT true,
  is_taxable boolean NOT NULL DEFAULT true,
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT products_price_positive CHECK (price >= 0),
  CONSTRAINT products_cost_price_positive CHECK (cost_price IS NULL OR cost_price >= 0),
  CONSTRAINT products_stock_valid CHECK (stock_quantity >= -1)
);

COMMENT ON TABLE public.products IS 'Products available for sale';
COMMENT ON COLUMN public.products.stock_quantity IS '-1 indicates unlimited stock';
COMMENT ON COLUMN public.products.min_stock_level IS 'Alert threshold for low stock';

COMMIT;
