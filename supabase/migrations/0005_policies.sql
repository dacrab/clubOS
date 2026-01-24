-- RLS Policies

BEGIN;

-- Tenants
CREATE POLICY tenants_select ON public.tenants FOR SELECT USING ((SELECT auth.role()) = 'service_role' OR id IN (SELECT user_tenant_ids()));
CREATE POLICY tenants_insert ON public.tenants FOR INSERT WITH CHECK ((SELECT auth.role()) = 'service_role');
CREATE POLICY tenants_update ON public.tenants FOR UPDATE USING ((SELECT auth.role()) = 'service_role' OR id IN (SELECT tenant_id FROM memberships WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin')));
CREATE POLICY tenants_delete ON public.tenants FOR DELETE USING ((SELECT auth.role()) = 'service_role');

-- Subscriptions
CREATE POLICY subscriptions_select ON public.subscriptions FOR SELECT USING ((SELECT auth.role()) = 'service_role' OR tenant_id IN (SELECT user_tenant_ids()));
CREATE POLICY subscriptions_insert ON public.subscriptions FOR INSERT WITH CHECK ((SELECT auth.role()) = 'service_role');
CREATE POLICY subscriptions_update ON public.subscriptions FOR UPDATE USING ((SELECT auth.role()) = 'service_role');
CREATE POLICY subscriptions_delete ON public.subscriptions FOR DELETE USING ((SELECT auth.role()) = 'service_role');

-- Facilities
CREATE POLICY facilities_select ON public.facilities FOR SELECT USING ((SELECT auth.role()) = 'service_role' OR id IN (SELECT user_facility_ids()));
CREATE POLICY facilities_insert ON public.facilities FOR INSERT WITH CHECK ((SELECT auth.role()) = 'service_role' OR is_facility_admin(id));
CREATE POLICY facilities_update ON public.facilities FOR UPDATE USING ((SELECT auth.role()) = 'service_role' OR is_facility_admin(id));
CREATE POLICY facilities_delete ON public.facilities FOR DELETE USING ((SELECT auth.role()) = 'service_role' OR is_facility_admin(id));

-- Users
CREATE POLICY users_select ON public.users FOR SELECT USING ((SELECT auth.role()) = 'service_role' OR id = (SELECT auth.uid()) OR id IN (SELECT m2.user_id FROM memberships m1 JOIN memberships m2 ON m1.tenant_id = m2.tenant_id WHERE m1.user_id = (SELECT auth.uid())));
CREATE POLICY users_insert ON public.users FOR INSERT WITH CHECK ((SELECT auth.role()) = 'service_role');
CREATE POLICY users_update ON public.users FOR UPDATE USING ((SELECT auth.role()) = 'service_role' OR id = (SELECT auth.uid()));
CREATE POLICY users_delete ON public.users FOR DELETE USING ((SELECT auth.role()) = 'service_role');

-- Memberships
CREATE POLICY memberships_select ON public.memberships FOR SELECT USING ((SELECT auth.role()) = 'service_role' OR user_id = (SELECT auth.uid()) OR tenant_id IN (SELECT user_tenant_ids()));
CREATE POLICY memberships_insert ON public.memberships FOR INSERT WITH CHECK ((SELECT auth.role()) = 'service_role' OR tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin')));
CREATE POLICY memberships_update ON public.memberships FOR UPDATE USING ((SELECT auth.role()) = 'service_role' OR tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin')));
CREATE POLICY memberships_delete ON public.memberships FOR DELETE USING ((SELECT auth.role()) = 'service_role' OR tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin')));

-- Categories
CREATE POLICY categories_select ON public.categories FOR SELECT USING (has_facility_access(facility_id));
CREATE POLICY categories_insert ON public.categories FOR INSERT WITH CHECK (is_facility_admin(facility_id));
CREATE POLICY categories_update ON public.categories FOR UPDATE USING (is_facility_admin(facility_id));
CREATE POLICY categories_delete ON public.categories FOR DELETE USING (is_facility_admin(facility_id));

-- Products
CREATE POLICY products_select ON public.products FOR SELECT USING (has_facility_access(facility_id));
CREATE POLICY products_insert ON public.products FOR INSERT WITH CHECK (is_facility_admin(facility_id));
CREATE POLICY products_update ON public.products FOR UPDATE USING (is_facility_admin(facility_id));
CREATE POLICY products_delete ON public.products FOR DELETE USING (is_facility_admin(facility_id));

-- Register Sessions
CREATE POLICY register_sessions_select ON public.register_sessions FOR SELECT USING (has_facility_access(facility_id));
CREATE POLICY register_sessions_insert ON public.register_sessions FOR INSERT WITH CHECK (has_facility_access(facility_id));
CREATE POLICY register_sessions_update ON public.register_sessions FOR UPDATE USING (has_facility_access(facility_id) AND (opened_by = (SELECT auth.uid()) OR is_facility_admin(facility_id)));

-- Orders
CREATE POLICY orders_select ON public.orders FOR SELECT USING (has_facility_access(facility_id));
CREATE POLICY orders_insert ON public.orders FOR INSERT WITH CHECK (has_facility_access(facility_id));
CREATE POLICY orders_update ON public.orders FOR UPDATE USING (has_facility_access(facility_id) AND (created_by = (SELECT auth.uid()) OR is_facility_admin(facility_id)));

-- Order Items
CREATE POLICY order_items_select ON public.order_items FOR SELECT USING (order_id IN (SELECT id FROM orders WHERE has_facility_access(facility_id)));
CREATE POLICY order_items_insert ON public.order_items FOR INSERT WITH CHECK (order_id IN (SELECT id FROM orders WHERE has_facility_access(facility_id)));
CREATE POLICY order_items_update ON public.order_items FOR UPDATE USING (order_id IN (SELECT id FROM orders WHERE has_facility_access(facility_id)));
CREATE POLICY order_items_delete ON public.order_items FOR DELETE USING (order_id IN (SELECT id FROM orders WHERE has_facility_access(facility_id)));

-- Bookings
CREATE POLICY bookings_select ON public.bookings FOR SELECT USING (has_facility_access(facility_id));
CREATE POLICY bookings_insert ON public.bookings FOR INSERT WITH CHECK (has_facility_access(facility_id));
CREATE POLICY bookings_update ON public.bookings FOR UPDATE USING (has_facility_access(facility_id));
CREATE POLICY bookings_delete ON public.bookings FOR DELETE USING (is_facility_admin(facility_id));

-- Keep Alive
CREATE POLICY keep_alive_all ON public.keep_alive FOR ALL USING ((SELECT auth.role()) = 'service_role');

-- Audit Log
CREATE POLICY audit_log_select ON public.audit_log FOR SELECT USING (
  (SELECT auth.role()) = 'service_role' 
  OR EXISTS (
    SELECT 1 FROM memberships 
    WHERE memberships.user_id = (SELECT auth.uid()) 
    AND memberships.role IN ('owner', 'admin')
  )
);

-- Analytics Views
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

CREATE VIEW public.v_low_stock_products AS
SELECT p.id, p.facility_id, p.name, p.price, p.stock_quantity, p.category_id, c.name AS category_name
FROM products p
LEFT JOIN categories c ON c.id = p.category_id
JOIN facilities f ON f.id = p.facility_id
JOIN tenants t ON t.id = f.tenant_id
WHERE p.track_inventory AND p.stock_quantity <= COALESCE((t.settings->>'low_stock_threshold')::integer, 5)
ORDER BY p.stock_quantity ASC, p.name;

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

CREATE VIEW public.v_weekly_revenue_full AS
WITH date_series AS (
  SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day')::date AS date
),
revenue_data AS (
  SELECT facility_id, DATE(created_at) AS date, COALESCE(SUM(total_amount), 0) AS revenue
  FROM orders WHERE created_at >= CURRENT_DATE - INTERVAL '6 days'
  GROUP BY facility_id, DATE(created_at)
)
SELECT f.id AS facility_id, d.date, TO_CHAR(d.date, 'Dy') AS day_name, COALESCE(r.revenue, 0) AS revenue
FROM facilities f CROSS JOIN date_series d
LEFT JOIN revenue_data r ON r.facility_id = f.id AND r.date = d.date
ORDER BY f.id, d.date;

CREATE VIEW public.v_category_sales AS
SELECT p.facility_id, COALESCE(c.name, 'Uncategorized') AS category_name, COALESCE(SUM(oi.quantity), 0)::integer AS total_quantity
FROM products p
LEFT JOIN categories c ON c.id = p.category_id
LEFT JOIN order_items oi ON oi.product_id = p.id AND NOT oi.is_deleted
LEFT JOIN orders o ON o.id = oi.order_id AND o.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY p.facility_id, COALESCE(c.name, 'Uncategorized')
HAVING COALESCE(SUM(oi.quantity), 0) > 0
ORDER BY total_quantity DESC;

CREATE VIEW public.v_session_orders AS
SELECT o.id, o.facility_id, o.session_id, o.subtotal, o.discount_amount, o.total_amount, o.coupon_count, o.created_at, o.created_by,
  COALESCE(jsonb_agg(jsonb_build_object(
    'id', oi.id, 'quantity', oi.quantity, 'unit_price', oi.unit_price, 'line_total', oi.line_total,
    'is_treat', oi.is_treat, 'is_deleted', oi.is_deleted, 'products', jsonb_build_object('id', p.id, 'name', p.name)
  ) ORDER BY oi.created_at) FILTER (WHERE oi.id IS NOT NULL), '[]'::jsonb) AS order_items
FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id LEFT JOIN products p ON p.id = oi.product_id
GROUP BY o.id;

-- Dashboard RPC - single call for all dashboard data
CREATE FUNCTION public.get_dashboard_data(p_facility_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  result jsonb;
  v_daily_stats record;
  v_low_stock_count integer;
  v_active_users integer;
BEGIN
  SELECT orders_count, revenue, discounts, coupons_used INTO v_daily_stats
  FROM v_daily_stats WHERE facility_id = p_facility_id;

  SELECT count INTO v_low_stock_count FROM v_low_stock WHERE facility_id = p_facility_id;

  SELECT COUNT(*)::integer INTO v_active_users FROM users;

  result := jsonb_build_object(
    'stats', jsonb_build_object(
      'todayRevenue', COALESCE(v_daily_stats.revenue, 0),
      'todayOrders', COALESCE(v_daily_stats.orders_count, 0),
      'lowStockCount', COALESCE(v_low_stock_count, 0),
      'activeUsers', v_active_users
    ),
    'revenueByDay', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('date', day_name, 'revenue', revenue) ORDER BY date), '[]'::jsonb)
      FROM v_weekly_revenue_full WHERE facility_id = p_facility_id
    ),
    'bestSellers', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('id', product_id, 'name', product_name, 'quantity', total_sold, 'categoryId', category_id) ORDER BY total_sold DESC), '[]'::jsonb)
      FROM (SELECT * FROM mv_best_sellers WHERE facility_id = p_facility_id ORDER BY total_sold DESC LIMIT 5) bs
    ),
    'categorySales', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('name', category_name, 'quantity', total_quantity) ORDER BY total_quantity DESC), '[]'::jsonb)
      FROM v_category_sales WHERE facility_id = p_facility_id
    ),
    'recentOrders', (
      SELECT COALESCE(jsonb_agg(row_to_json(ro.*) ORDER BY ro.created_at DESC), '[]'::jsonb)
      FROM (SELECT * FROM v_recent_orders WHERE facility_id = p_facility_id ORDER BY created_at DESC LIMIT 5) ro
    )
  );
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_data TO authenticated;

-- Register sessions RPC - sessions with orders in one call
CREATE FUNCTION public.get_register_sessions(p_facility_id uuid, p_limit integer DEFAULT 50)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  result jsonb;
BEGIN
  result := jsonb_build_object(
    'sessions', (
      SELECT COALESCE(jsonb_agg(row_to_json(s.*) ORDER BY s.opened_at DESC), '[]'::jsonb)
      FROM (SELECT * FROM register_sessions WHERE facility_id = p_facility_id ORDER BY opened_at DESC LIMIT p_limit) s
    ),
    'orders', (
      SELECT COALESCE(jsonb_agg(row_to_json(o.*) ORDER BY o.created_at DESC), '[]'::jsonb)
      FROM v_session_orders o
      WHERE o.facility_id = p_facility_id
        AND o.session_id IN (SELECT id FROM register_sessions WHERE facility_id = p_facility_id ORDER BY opened_at DESC LIMIT p_limit)
    )
  );
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_register_sessions TO authenticated;

COMMIT;
