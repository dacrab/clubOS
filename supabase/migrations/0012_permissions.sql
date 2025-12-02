-- ============================================================================
-- ClubOS Database Schema v2.0
-- Migration 12: Permissions and Final Setup
-- ============================================================================

BEGIN;

-- ============================================================================
-- Schema Permissions
-- ============================================================================

-- Grant usage on public schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant permissions on all tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Grant permissions on all sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Grant execute on all functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
  GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
  GRANT EXECUTE ON FUNCTIONS TO authenticated;

-- ============================================================================
-- Utility Functions
-- ============================================================================

-- Generate a slug from text
CREATE OR REPLACE FUNCTION public.slugify(text)
RETURNS text 
LANGUAGE sql IMMUTABLE STRICT
SET search_path = ''
AS $$
  SELECT lower(
    regexp_replace(
      regexp_replace($1, '[^a-zA-Z0-9\s-]', '', 'g'),
      '[\s-]+', '-', 'g'
    )
  )
$$;

COMMENT ON FUNCTION public.slugify IS 'Convert text to URL-friendly slug';

-- Get settings for a tenant/facility
CREATE OR REPLACE FUNCTION public.get_settings(p_tenant_id uuid, p_facility_id uuid DEFAULT NULL)
RETURNS public.tenant_settings 
LANGUAGE sql STABLE SECURITY DEFINER 
SET search_path = '' 
AS $$
  SELECT * FROM public.tenant_settings
  WHERE tenant_id = p_tenant_id 
    AND (
      (p_facility_id IS NULL AND facility_id IS NULL) OR
      (facility_id = p_facility_id) OR
      (p_facility_id IS NOT NULL AND facility_id IS NULL)
    )
  ORDER BY facility_id NULLS LAST
  LIMIT 1
$$;

COMMENT ON FUNCTION public.get_settings IS 'Get settings for tenant, with facility override if exists';

-- Check if an open register session exists
CREATE OR REPLACE FUNCTION public.has_open_register(p_facility_id uuid)
RETURNS boolean 
LANGUAGE sql STABLE SECURITY DEFINER 
SET search_path = '' 
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.register_sessions
    WHERE facility_id = p_facility_id AND closed_at IS NULL
  )
$$;

COMMENT ON FUNCTION public.has_open_register IS 'Check if facility has an open register session';

-- Get current open register session
CREATE OR REPLACE FUNCTION public.get_open_register(p_facility_id uuid)
RETURNS public.register_sessions 
LANGUAGE sql STABLE SECURITY DEFINER 
SET search_path = '' 
AS $$
  SELECT * FROM public.register_sessions
  WHERE facility_id = p_facility_id AND closed_at IS NULL
  LIMIT 1
$$;

COMMENT ON FUNCTION public.get_open_register IS 'Get the current open register session for a facility';

-- Calculate order totals
CREATE OR REPLACE FUNCTION public.calculate_order_totals(p_order_id uuid)
RETURNS TABLE(subtotal numeric, tax_amount numeric, total_amount numeric) 
LANGUAGE sql STABLE 
SET search_path = '' 
AS $$
  WITH items AS (
    SELECT 
      SUM(line_total) AS subtotal
    FROM public.order_items
    WHERE order_id = p_order_id
  )
  SELECT 
    items.subtotal,
    0::numeric AS tax_amount, -- Tax calculation would go here
    items.subtotal AS total_amount
  FROM items
$$;

COMMENT ON FUNCTION public.calculate_order_totals IS 'Calculate order totals from line items';

COMMIT;
