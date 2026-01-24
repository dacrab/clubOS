-- Fix Supabase linter security warnings
-- Addresses: function_search_path_mutable, extension_in_public, auth_rls_initplan

BEGIN;

-- ============================================================================
-- 1. Move extensions from public to extensions schema
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS extensions;

-- Drop dependent index before moving pg_trgm
DROP INDEX IF EXISTS public.idx_bookings_customer_trigram;

-- Move pg_trgm to extensions schema
DROP EXTENSION IF EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;

-- Recreate the trigram index
CREATE INDEX idx_bookings_customer_trigram ON public.bookings USING gin (customer_name extensions.gin_trgm_ops);

-- Drop ALL constraints that depend on btree_gist
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

-- ============================================================================
-- 2. Fix functions missing search_path (7 functions)
-- ============================================================================

-- Fix audit_trigger
CREATE OR REPLACE FUNCTION public.audit_trigger() 
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log(table_name, record_id, action, old_data, changed_by)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log(table_name, record_id, action, old_data, new_data, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log(table_name, record_id, action, new_data, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  END IF;
END;
$$;

-- Fix get_category_descendants (returns SETOF uuid)
CREATE OR REPLACE FUNCTION public.get_category_descendants(category_uuid uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH RECURSIVE descendants AS (
    SELECT id FROM categories WHERE id = category_uuid
    UNION ALL
    SELECT c.id FROM categories c JOIN descendants d ON c.parent_id = d.id
  )
  SELECT id FROM descendants;
$$;

-- Fix get_category_tree
CREATE OR REPLACE FUNCTION public.get_category_tree(facility_uuid uuid)
RETURNS TABLE(id uuid, name text, parent_id uuid, level integer, path text)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH RECURSIVE tree AS (
    SELECT c.id, c.name, c.parent_id, 1 as level, c.name as path
    FROM categories c WHERE c.facility_id = facility_uuid AND c.parent_id IS NULL
    UNION ALL
    SELECT c.id, c.name, c.parent_id, t.level + 1, t.path || ' > ' || c.name
    FROM categories c JOIN tree t ON c.parent_id = t.id
  )
  SELECT t.id, t.name, t.parent_id, t.level, t.path FROM tree t ORDER BY t.path;
$$;

-- Fix get_product_performance (correct column names: total_qty, sales_rank)
CREATE OR REPLACE FUNCTION public.get_product_performance(facility_uuid uuid, days_back integer DEFAULT 30)
RETURNS TABLE(product_id uuid, product_name text, total_qty integer, total_revenue numeric, sales_rank integer)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT oi.product_id, oi.product_name, SUM(oi.quantity)::int, SUM(oi.line_total),
    RANK() OVER (ORDER BY SUM(oi.line_total) DESC)::int
  FROM order_items oi JOIN orders o ON oi.order_id = o.id
  WHERE o.facility_id = facility_uuid AND o.created_at >= CURRENT_DATE - days_back AND NOT oi.is_deleted
  GROUP BY oi.product_id, oi.product_name ORDER BY 4 DESC;
$$;

-- Fix get_sales_trends
CREATE OR REPLACE FUNCTION public.get_sales_trends(facility_uuid uuid, days_back integer DEFAULT 30)
RETURNS TABLE(date date, daily_sales numeric, running_total numeric, pct_change numeric)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH daily AS (
    SELECT o.created_at::date as date, SUM(o.total_amount) as daily_sales
    FROM orders o WHERE o.facility_id = facility_uuid AND o.created_at >= CURRENT_DATE - days_back
    GROUP BY o.created_at::date
  )
  SELECT d.date, d.daily_sales,
    SUM(d.daily_sales) OVER (ORDER BY d.date) as running_total,
    ROUND((d.daily_sales - LAG(d.daily_sales) OVER (ORDER BY d.date)) / NULLIF(LAG(d.daily_sales) OVER (ORDER BY d.date), 0) * 100, 1) as pct_change
  FROM daily d ORDER BY d.date;
$$;

-- Fix refresh_best_sellers
CREATE OR REPLACE FUNCTION public.refresh_best_sellers()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN 
  REFRESH MATERIALIZED VIEW mv_best_sellers; 
END;
$$;

-- Fix search_products (no DEFAULT on search_text to match existing signature)
CREATE OR REPLACE FUNCTION public.search_products(facility_uuid uuid, search_text text)
RETURNS TABLE(id uuid, name text, price numeric, stock_quantity integer, category_id uuid, rank real)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT p.id, p.name, p.price, p.stock_quantity, p.category_id,
         ts_rank(p.search_vector, plainto_tsquery('english', search_text)) as rank
  FROM products p
  WHERE p.facility_id = facility_uuid 
    AND (search_text = '' OR p.search_vector @@ plainto_tsquery('english', search_text))
  ORDER BY rank DESC, p.name;
$$;

-- ============================================================================
-- 3. Fix RLS policy with initplan warning (auth_rls_initplan)
-- ============================================================================

DROP POLICY IF EXISTS audit_log_select ON public.audit_log;

CREATE POLICY audit_log_select ON public.audit_log 
FOR SELECT 
USING (
  (SELECT auth.role()) = 'service_role' 
  OR EXISTS (
    SELECT 1 FROM memberships 
    WHERE memberships.user_id = (SELECT auth.uid()) 
    AND memberships.role IN ('owner', 'admin')
  )
);

COMMIT;
