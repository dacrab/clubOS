-- Add missing production features to local migrations
-- Features: audit_log, search_vector, mv_best_sellers, search_products

BEGIN;

-- ============================================================================
-- 1. Audit Log table and trigger
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  changed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_table ON public.audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_record ON public.audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON public.audit_log(changed_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_log_select ON public.audit_log FOR SELECT USING (
  (SELECT auth.role()) = 'service_role' 
  OR EXISTS (
    SELECT 1 FROM memberships 
    WHERE memberships.user_id = (SELECT auth.uid()) 
    AND memberships.role IN ('owner', 'admin')
  )
);

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

-- Audit triggers on key tables
CREATE TRIGGER audit_orders AFTER INSERT OR UPDATE OR DELETE ON public.orders 
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
CREATE TRIGGER audit_bookings AFTER INSERT OR UPDATE OR DELETE ON public.bookings 
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
CREATE TRIGGER audit_products AFTER INSERT OR UPDATE OR DELETE ON public.products 
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- ============================================================================
-- 2. Product search vector
-- ============================================================================

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Auto-update search_vector on insert/update
CREATE OR REPLACE FUNCTION public.products_search_update() 
RETURNS trigger 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.name, '') || ' ' || COALESCE(NEW.description, ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER products_search_trigger BEFORE INSERT OR UPDATE OF name, description ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.products_search_update();

CREATE INDEX IF NOT EXISTS idx_products_search ON public.products USING gin(search_vector);

-- Search products RPC
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

GRANT EXECUTE ON FUNCTION public.search_products TO authenticated;

-- ============================================================================
-- 3. Best sellers materialized view
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_best_sellers AS
SELECT 
  p.facility_id,
  p.id AS product_id,
  p.name AS product_name,
  p.category_id,
  COALESCE(SUM(oi.quantity), 0) AS total_sold
FROM products p
LEFT JOIN order_items oi ON oi.product_id = p.id AND NOT oi.is_deleted
LEFT JOIN orders o ON o.id = oi.order_id AND o.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY p.facility_id, p.id, p.name, p.category_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_best_sellers_product ON public.mv_best_sellers(product_id);
CREATE INDEX IF NOT EXISTS idx_mv_best_sellers_facility ON public.mv_best_sellers(facility_id);

COMMIT;
