-- Additional features: audit, search, analytics views

BEGIN;

-- ============================================================================
-- Audit Log
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

CREATE INDEX idx_audit_log_record ON public.audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_changed_at ON public.audit_log(changed_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_log_select ON public.audit_log FOR SELECT USING (
  (SELECT auth.role()) = 'service_role' 
  OR EXISTS (
    SELECT 1 FROM memberships 
    WHERE memberships.user_id = (SELECT auth.uid()) 
    AND memberships.role IN ('owner', 'admin')
  )
);

CREATE FUNCTION public.audit_trigger() 
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

CREATE TRIGGER audit_orders AFTER INSERT OR UPDATE OR DELETE ON public.orders 
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
CREATE TRIGGER audit_bookings AFTER INSERT OR UPDATE OR DELETE ON public.bookings 
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
CREATE TRIGGER audit_products AFTER INSERT OR UPDATE OR DELETE ON public.products 
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- ============================================================================
-- Product Full-Text Search
-- ============================================================================

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX idx_products_search ON public.products USING gin(search_vector);

CREATE FUNCTION public.search_products(facility_uuid uuid, search_text text)
RETURNS TABLE(id uuid, name text, price numeric, stock_quantity integer, category_id uuid, rank real)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT p.id, p.name, p.price, p.stock_quantity, p.category_id,
         ts_rank(p.search_vector, plainto_tsquery('english', search_text)) as rank
  FROM products p
  WHERE p.facility_id = facility_uuid 
    AND (search_text = '' OR p.search_vector @@ plainto_tsquery('english', search_text))
  ORDER BY rank DESC, p.name;
$$;

GRANT EXECUTE ON FUNCTION public.search_products TO authenticated;

-- ============================================================================
-- Analytics Views
-- ============================================================================

CREATE MATERIALIZED VIEW public.mv_best_sellers AS
SELECT p.facility_id, p.id AS product_id, p.name AS product_name, p.category_id,
       COALESCE(SUM(oi.quantity), 0) AS total_sold
FROM products p
LEFT JOIN order_items oi ON oi.product_id = p.id AND NOT oi.is_deleted
LEFT JOIN orders o ON o.id = oi.order_id AND o.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY p.facility_id, p.id, p.name, p.category_id;

CREATE UNIQUE INDEX idx_mv_best_sellers_product ON public.mv_best_sellers(product_id);
CREATE INDEX idx_mv_best_sellers_facility ON public.mv_best_sellers(facility_id);

CREATE VIEW public.v_daily_stats AS
SELECT facility_id, COUNT(*) AS orders_count, COALESCE(SUM(total_amount), 0) AS revenue,
       COALESCE(SUM(discount_amount), 0) AS discounts, COALESCE(SUM(coupon_count), 0) AS coupons_used
FROM orders WHERE created_at >= CURRENT_DATE GROUP BY facility_id;

CREATE VIEW public.v_low_stock AS
SELECT p.facility_id, COUNT(*) AS count
FROM products p JOIN facilities f ON f.id = p.facility_id JOIN tenants t ON t.id = f.tenant_id
WHERE p.track_inventory AND p.stock_quantity <= COALESCE((t.settings->>'low_stock_threshold')::integer, 5)
GROUP BY p.facility_id;

CREATE VIEW public.v_recent_orders AS
SELECT o.id, o.facility_id, o.total_amount, o.subtotal, o.discount_amount, o.coupon_count, o.created_at, o.created_by,
  COALESCE(jsonb_agg(jsonb_build_object(
    'id', oi.id, 'quantity', oi.quantity, 'unit_price', oi.unit_price, 'line_total', oi.line_total,
    'is_treat', oi.is_treat, 'is_deleted', oi.is_deleted, 'product', jsonb_build_object('id', p.id, 'name', p.name)
  ) ORDER BY oi.created_at) FILTER (WHERE oi.id IS NOT NULL), '[]'::jsonb) AS items
FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id LEFT JOIN products p ON p.id = oi.product_id
GROUP BY o.id;

CREATE VIEW public.v_weekly_revenue AS
SELECT facility_id, DATE(created_at) AS date, COALESCE(SUM(total_amount), 0) AS revenue
FROM orders WHERE created_at >= CURRENT_DATE - INTERVAL '6 days'
GROUP BY facility_id, DATE(created_at);

-- ============================================================================
-- Table Documentation
-- ============================================================================

COMMENT ON TABLE public.tenants IS 'Organizations/companies using the platform (multi-tenant root)';
COMMENT ON TABLE public.subscriptions IS 'Stripe billing subscriptions per tenant';
COMMENT ON TABLE public.facilities IS 'Physical locations belonging to a tenant (clubs, venues)';
COMMENT ON TABLE public.users IS 'User profiles synced from auth.users';
COMMENT ON TABLE public.memberships IS 'User-to-tenant/facility assignments with roles';
COMMENT ON TABLE public.categories IS 'Product categories per facility (hierarchical)';
COMMENT ON TABLE public.products IS 'Inventory items for sale at POS';
COMMENT ON TABLE public.register_sessions IS 'Cash register shift sessions';
COMMENT ON TABLE public.orders IS 'POS sales transactions';
COMMENT ON TABLE public.order_items IS 'Line items within an order';
COMMENT ON TABLE public.bookings IS 'Reservations (birthdays, football fields, events)';
COMMENT ON TABLE public.audit_log IS 'Change history for orders, bookings, products';
COMMENT ON TABLE public.keep_alive IS 'Heartbeat table for cron health checks';

COMMIT;
