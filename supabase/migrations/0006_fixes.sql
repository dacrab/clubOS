-- Fixes: search_vector trigger, activeUsers bug, race condition lock,
--        orders_update policy, low_stock threshold, opened_at default,
--        missing indexes, jsonb consolidation in create_order,
--        memberships updated_at, view key consistency, Number() casting in RPCs

BEGIN;

-- ============================================================
-- 1. search_vector auto-update trigger (FTS was effectively dead)
-- ============================================================
CREATE FUNCTION public.update_product_search_vector() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.search_vector := to_tsvector('simple',
    COALESCE(NEW.name, '') || ' ' || COALESCE(NEW.description, '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_product_search_vector
  BEFORE INSERT OR UPDATE OF name, description ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_product_search_vector();

-- Backfill existing products
UPDATE public.products
SET search_vector = to_tsvector('simple', COALESCE(name, '') || ' ' || COALESCE(description, ''));

-- ============================================================
-- 2. Fix register_sessions.opened_at — set NOT NULL DEFAULT now()
--    and remove the side-effect UPDATE from create_order()
-- ============================================================
ALTER TABLE public.register_sessions
  ALTER COLUMN opened_at SET DEFAULT now(),
  ALTER COLUMN opened_at SET NOT NULL;

-- Backfill any existing NULL opened_at (use created_at as best approximation)
UPDATE public.register_sessions SET opened_at = created_at WHERE opened_at IS NULL;

-- ============================================================
-- 3. Add updated_at to memberships
-- ============================================================
ALTER TABLE public.memberships
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- 4. Missing indexes
-- ============================================================

-- Stripe webhook lookup (currently full table scan)
CREATE INDEX idx_subscriptions_stripe_customer ON public.subscriptions(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- order_items.product_id — hit on every stock update trigger
CREATE INDEX idx_order_items_product ON public.order_items(product_id);

-- ============================================================
-- 5. Fix v_low_stock / v_low_stock_products threshold fallback
--    App DEFAULT_SETTINGS uses 3, views fell back to 5 — align them
-- ============================================================
CREATE OR REPLACE VIEW public.v_low_stock AS
SELECT p.facility_id, COUNT(*) AS count
FROM products p
JOIN facilities f ON f.id = p.facility_id
JOIN tenants t ON t.id = f.tenant_id
WHERE p.track_inventory
  AND p.stock_quantity <= COALESCE((t.settings->>'low_stock_threshold')::integer, 3)
GROUP BY p.facility_id;

CREATE OR REPLACE VIEW public.v_low_stock_products AS
SELECT p.id, p.facility_id, p.name, p.price, p.stock_quantity, p.category_id,
       c.name AS category_name
FROM products p
LEFT JOIN categories c ON c.id = p.category_id
JOIN facilities f ON f.id = p.facility_id
JOIN tenants t ON t.id = f.tenant_id
WHERE p.track_inventory
  AND p.stock_quantity <= COALESCE((t.settings->>'low_stock_threshold')::integer, 3)
ORDER BY p.stock_quantity ASC, p.name;

-- ============================================================
-- 6. Fix v_recent_orders: use 'products' key (not 'product')
--    to match v_orders_list and the OrderItemView TypeScript type
-- ============================================================
CREATE OR REPLACE VIEW public.v_recent_orders AS
SELECT o.id, o.facility_id, o.total_amount, o.subtotal, o.discount_amount,
       o.coupon_count, o.created_at, o.created_by,
  COALESCE(jsonb_agg(jsonb_build_object(
    'id', oi.id,
    'quantity', oi.quantity,
    'unit_price', oi.unit_price,
    'line_total', oi.line_total,
    'is_treat', oi.is_treat,
    'is_deleted', oi.is_deleted,
    'products', jsonb_build_object('id', p.id, 'name', p.name)
  ) ORDER BY oi.created_at) FILTER (WHERE oi.id IS NOT NULL), '[]'::jsonb) AS order_items
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
LEFT JOIN products p ON p.id = oi.product_id
GROUP BY o.id;

-- ============================================================
-- 7. Fix orders_update policy — staff must not modify financial records
--    Only admins/owners can update orders
-- ============================================================
DROP POLICY IF EXISTS orders_update ON public.orders;
CREATE POLICY orders_update ON public.orders
  FOR UPDATE USING (is_facility_admin(facility_id));

-- ============================================================
-- 8. Fix create_order: parse jsonb once via CTE, add FOR UPDATE lock
--    on session row, cast numeric results to float8 to avoid
--    app-side Number() casting
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_order(
  p_facility_id uuid,
  p_session_id  uuid,
  p_user_id     uuid,
  p_items       jsonb,
  p_coupon_count integer DEFAULT 0,
  p_coupon_value  numeric DEFAULT 0.50
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order_id uuid;
  v_subtotal numeric(10,2);
  v_discount numeric(10,2);
  v_total    numeric(10,2);
BEGIN
  -- Lock session row to prevent double-submit race
  PERFORM 1 FROM register_sessions
  WHERE id = p_session_id AND facility_id = p_facility_id AND closed_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'No active register session');
  END IF;

  -- Parse items once, join products, validate existence and stock in one CTE
  CREATE TEMP TABLE _order_items ON COMMIT DROP AS
  SELECT
    i.product_id,
    i.quantity,
    i.unit_price,
    COALESCE(i.is_treat, false)                                       AS is_treat,
    p.name                                                            AS product_name,
    p.track_inventory,
    p.stock_quantity,
    CASE WHEN COALESCE(i.is_treat, false) THEN 0
         ELSE i.unit_price * i.quantity END                           AS line_total
  FROM jsonb_to_recordset(p_items)
         AS i(product_id uuid, quantity int, unit_price numeric, is_treat boolean)
  JOIN products p ON p.id = i.product_id AND p.facility_id = p_facility_id;

  -- Validate: all products found
  IF (SELECT COUNT(*) FROM jsonb_to_recordset(p_items)
        AS i(product_id uuid, quantity int, unit_price numeric, is_treat boolean))
     > (SELECT COUNT(*) FROM _order_items) THEN
    RETURN jsonb_build_object('error', 'Product not found');
  END IF;

  -- Validate: sufficient stock
  IF EXISTS (
    SELECT 1 FROM _order_items
    WHERE track_inventory AND stock_quantity < quantity
  ) THEN
    RETURN jsonb_build_object('error', 'Insufficient stock');
  END IF;

  SELECT COALESCE(SUM(CASE WHEN NOT is_treat THEN line_total ELSE 0 END), 0)
  INTO v_subtotal FROM _order_items;

  v_discount := p_coupon_count * p_coupon_value;
  v_total    := GREATEST(0, v_subtotal - v_discount);

  INSERT INTO orders (facility_id, session_id, subtotal, discount_amount, total_amount, coupon_count, created_by)
  VALUES (p_facility_id, p_session_id, v_subtotal, v_discount, v_total, p_coupon_count, p_user_id)
  RETURNING id INTO v_order_id;

  INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, line_total, is_treat)
  SELECT v_order_id, product_id, product_name, quantity, unit_price, line_total, is_treat
  FROM _order_items;

  -- Return with explicit float8 casts — no Number() coercion needed in app
  RETURN jsonb_build_object(
    'id',              v_order_id,
    'subtotal',        v_subtotal::float8,
    'discount_amount', v_discount::float8,
    'total_amount',    v_total::float8
  );
END;
$$;

-- ============================================================
-- 9. Fix close_register_session: add FOR UPDATE row lock
--    and cast numerics to float8
-- ============================================================
CREATE OR REPLACE FUNCTION public.close_register_session(
  p_session_id   uuid,
  p_user_id      uuid,
  p_closing_cash numeric,
  p_notes        text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_session  record;
  v_expected numeric(10,2);
  v_summary  jsonb;
BEGIN
  -- Lock row to prevent concurrent closes
  SELECT * INTO v_session FROM register_sessions
  WHERE id = p_session_id AND closed_at IS NULL
  FOR UPDATE;

  IF v_session IS NULL THEN
    RETURN jsonb_build_object('error', 'Session not found or already closed');
  END IF;

  SELECT
    COALESCE(SUM(total_amount), 0) + v_session.opening_cash,
    jsonb_build_object(
      'orders_count',   COUNT(*),
      'total_sales',    COALESCE(SUM(total_amount), 0)::float8,
      'total_discount', COALESCE(SUM(discount_amount), 0)::float8,
      'coupons_used',   COALESCE(SUM(coupon_count), 0),
      'cash_variance',  (p_closing_cash - (COALESCE(SUM(total_amount), 0) + v_session.opening_cash))::float8
    )
  INTO v_expected, v_summary
  FROM orders WHERE session_id = p_session_id;

  UPDATE register_sessions
  SET closed_at = now(), closed_by = p_user_id,
      closing_cash = p_closing_cash, expected_cash = v_expected,
      notes = p_notes, summary = v_summary
  WHERE id = p_session_id;

  RETURN jsonb_build_object(
    'id',            p_session_id,
    'expected_cash', v_expected::float8,
    'closing_cash',  p_closing_cash::float8,
    'variance',      (p_closing_cash - v_expected)::float8,
    'summary',       v_summary
  );
END;
$$;

-- ============================================================
-- 10. Fix get_dashboard_data: activeUsers scoped to facility/tenant,
--     cast all numerics to float8 to eliminate app-side Number() calls
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_dashboard_data(p_facility_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  result          jsonb;
  v_daily_stats   record;
  v_low_stock_count integer;
  v_active_users  integer;
  v_tenant_id     uuid;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM facilities WHERE id = p_facility_id;

  SELECT orders_count, revenue, discounts, coupons_used INTO v_daily_stats
  FROM v_daily_stats WHERE facility_id = p_facility_id;

  SELECT count INTO v_low_stock_count FROM v_low_stock WHERE facility_id = p_facility_id;

  -- Count users belonging to the facility's tenant (not all platform users)
  SELECT COUNT(DISTINCT m.user_id)::integer INTO v_active_users
  FROM memberships m
  WHERE m.tenant_id = v_tenant_id;

  result := jsonb_build_object(
    'stats', jsonb_build_object(
      'todayRevenue',  COALESCE(v_daily_stats.revenue, 0)::float8,
      'todayOrders',   COALESCE(v_daily_stats.orders_count, 0),
      'lowStockCount', COALESCE(v_low_stock_count, 0),
      'activeUsers',   v_active_users
    ),
    'revenueByDay', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object('date', day_name, 'revenue', revenue::float8)
        ORDER BY date
      ), '[]'::jsonb)
      FROM v_weekly_revenue_full WHERE facility_id = p_facility_id
    ),
    'bestSellers', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id',         product_id,
          'name',       product_name,
          'quantity',   total_sold,
          'categoryId', category_id
        ) ORDER BY total_sold DESC
      ), '[]'::jsonb)
      FROM (
        SELECT * FROM mv_best_sellers
        WHERE facility_id = p_facility_id
        ORDER BY total_sold DESC LIMIT 5
      ) bs
    ),
    'categorySales', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object('name', category_name, 'quantity', total_quantity)
        ORDER BY total_quantity DESC
      ), '[]'::jsonb)
      FROM v_category_sales WHERE facility_id = p_facility_id
    ),
    'recentOrders', (
      SELECT COALESCE(jsonb_agg(row_to_json(ro.*) ORDER BY ro.created_at DESC), '[]'::jsonb)
      FROM (
        SELECT * FROM v_recent_orders
        WHERE facility_id = p_facility_id
        ORDER BY created_at DESC LIMIT 5
      ) ro
    )
  );
  RETURN result;
END;
$$;

COMMIT;
