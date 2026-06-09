-- Fix SECURITY DEFINER warnings
-- Trigger functions: keep SECURITY DEFINER (need elevated perms) but revoke public EXECUTE
REVOKE EXECUTE ON FUNCTION public.audit_trigger() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- RLS helpers: switch to SECURITY INVOKER (they only call auth.uid() which works as invoker)
CREATE OR REPLACE FUNCTION public.user_tenant_ids() RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT DISTINCT tenant_id FROM memberships WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.user_facility_ids() RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT DISTINCT f.id FROM facilities f
  JOIN memberships m ON m.tenant_id = f.tenant_id
  WHERE m.user_id = auth.uid() AND (m.facility_id IS NULL OR m.facility_id = f.id);
$$;

CREATE OR REPLACE FUNCTION public.has_facility_access(fid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM user_facility_ids() AS id WHERE id = fid);
$$;

CREATE OR REPLACE FUNCTION public.is_facility_admin(fid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships m JOIN facilities f ON f.tenant_id = m.tenant_id
    WHERE m.user_id = auth.uid() AND f.id = fid AND m.role IN ('owner', 'admin')
    AND (m.facility_id IS NULL OR m.facility_id = fid)
  );
$$;

-- App RPCs: switch to SECURITY INVOKER (RLS on underlying tables handles access)
CREATE OR REPLACE FUNCTION public.check_booking_conflict(
  p_facility_id uuid, p_type public.booking_type,
  p_starts_at timestamptz, p_ends_at timestamptz, p_exclude_id uuid DEFAULT NULL
) RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM bookings
    WHERE facility_id = p_facility_id AND type = p_type
      AND status NOT IN ('canceled', 'no_show')
      AND (p_exclude_id IS NULL OR id != p_exclude_id)
      AND (starts_at, ends_at) OVERLAPS (p_starts_at, p_ends_at)
  );
$$;

CREATE OR REPLACE FUNCTION public.create_order(
  p_facility_id uuid, p_session_id uuid, p_user_id uuid,
  p_items jsonb, p_coupon_count integer DEFAULT 0, p_coupon_value numeric DEFAULT 0.50
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_order_id uuid;
  v_subtotal numeric(10,2) := 0;
  v_discount numeric(10,2);
  v_total numeric(10,2);
  v_item record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM register_sessions WHERE id = p_session_id AND facility_id = p_facility_id AND closed_at IS NULL) THEN
    RETURN jsonb_build_object('error', 'No active register session');
  END IF;

  FOR v_item IN
    SELECT i.*, p.name, p.stock_quantity, p.track_inventory
    FROM jsonb_to_recordset(p_items) AS i(product_id uuid, quantity int, unit_price numeric, is_treat boolean)
    JOIN products p ON p.id = i.product_id AND p.facility_id = p_facility_id
  LOOP
    IF v_item.name IS NULL THEN RETURN jsonb_build_object('error', 'Product not found'); END IF;
    IF v_item.track_inventory AND v_item.stock_quantity < v_item.quantity THEN
      RETURN jsonb_build_object('error', 'Insufficient stock for: ' || v_item.name);
    END IF;
    IF NOT COALESCE(v_item.is_treat, false) THEN
      v_subtotal := v_subtotal + v_item.unit_price * v_item.quantity;
    END IF;
  END LOOP;

  v_discount := p_coupon_count * p_coupon_value;
  v_total := GREATEST(0, v_subtotal - v_discount);

  UPDATE register_sessions SET opened_at = now() WHERE id = p_session_id AND opened_at IS NULL;

  INSERT INTO orders (facility_id, session_id, subtotal, discount_amount, total_amount, coupon_count, created_by)
  VALUES (p_facility_id, p_session_id, v_subtotal, v_discount, v_total, p_coupon_count, p_user_id)
  RETURNING id INTO v_order_id;

  INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, line_total, is_treat)
  SELECT v_order_id, i.product_id, p.name, i.quantity, i.unit_price,
    CASE WHEN COALESCE(i.is_treat, false) THEN 0 ELSE i.unit_price * i.quantity END,
    COALESCE(i.is_treat, false)
  FROM jsonb_to_recordset(p_items) AS i(product_id uuid, quantity int, unit_price numeric, is_treat boolean)
  JOIN products p ON p.id = i.product_id;

  RETURN jsonb_build_object('id', v_order_id, 'subtotal', v_subtotal, 'discount_amount', v_discount, 'total_amount', v_total);
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_order TO authenticated;

CREATE OR REPLACE FUNCTION public.close_register_session(
  p_session_id uuid, p_user_id uuid, p_closing_cash numeric, p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_session record;
  v_expected numeric(10,2);
  v_summary jsonb;
BEGIN
  SELECT * INTO v_session FROM register_sessions WHERE id = p_session_id AND closed_at IS NULL;
  IF v_session IS NULL THEN RETURN jsonb_build_object('error', 'Session not found or already closed'); END IF;

  SELECT COALESCE(SUM(total_amount), 0) + v_session.opening_cash INTO v_expected FROM orders WHERE session_id = p_session_id;

  SELECT jsonb_build_object('orders_count', COUNT(*), 'total_sales', COALESCE(SUM(total_amount), 0),
    'total_discount', COALESCE(SUM(discount_amount), 0), 'coupons_used', COALESCE(SUM(coupon_count), 0),
    'cash_variance', p_closing_cash - v_expected) INTO v_summary FROM orders WHERE session_id = p_session_id;

  UPDATE register_sessions SET closed_at = now(), closed_by = p_user_id, closing_cash = p_closing_cash,
    expected_cash = v_expected, notes = p_notes, summary = v_summary WHERE id = p_session_id;

  RETURN jsonb_build_object('id', p_session_id, 'expected_cash', v_expected, 'closing_cash', p_closing_cash,
    'variance', p_closing_cash - v_expected, 'summary', v_summary);
END;
$$;
GRANT EXECUTE ON FUNCTION public.close_register_session TO authenticated;

CREATE OR REPLACE FUNCTION public.get_dashboard_data(p_facility_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
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

CREATE OR REPLACE FUNCTION public.get_register_sessions(p_facility_id uuid, p_limit integer DEFAULT 50)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE result jsonb;
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

CREATE OR REPLACE FUNCTION public.get_user_context(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE
  result jsonb;
  v_membership record;
  v_profile record;
  v_subscription record;
  v_session record;
  v_tenant record;
BEGIN
  SELECT m.role, m.tenant_id, m.facility_id, m.is_primary INTO v_membership
  FROM memberships m WHERE m.user_id = p_user_id ORDER BY m.is_primary DESC LIMIT 1;

  IF v_membership IS NULL THEN RETURN jsonb_build_object('membership', null); END IF;

  SELECT full_name, avatar_url INTO v_profile FROM users WHERE id = p_user_id;
  SELECT id, name, slug, settings INTO v_tenant FROM tenants WHERE id = v_membership.tenant_id;
  SELECT status, plan_name, current_period_end, trial_end INTO v_subscription FROM subscriptions WHERE tenant_id = v_membership.tenant_id;
  SELECT * INTO v_session FROM register_sessions
  WHERE facility_id = v_membership.facility_id AND closed_at IS NULL ORDER BY opened_at DESC LIMIT 1;

  result := jsonb_build_object(
    'membership', jsonb_build_object('role', v_membership.role, 'tenantId', v_membership.tenant_id, 'facilityId', v_membership.facility_id),
    'profile', jsonb_build_object('fullName', v_profile.full_name, 'avatarUrl', v_profile.avatar_url),
    'tenant', CASE WHEN v_tenant.id IS NOT NULL THEN jsonb_build_object('id', v_tenant.id, 'name', v_tenant.name, 'slug', v_tenant.slug, 'settings', v_tenant.settings) ELSE null END,
    'subscription', CASE WHEN v_subscription.status IS NOT NULL THEN jsonb_build_object('status', v_subscription.status, 'planName', v_subscription.plan_name, 'periodEnd', v_subscription.current_period_end, 'trialEnd', v_subscription.trial_end) ELSE null END,
    'activeSession', CASE WHEN v_session.id IS NOT NULL THEN row_to_json(v_session) ELSE null END
  );
  RETURN result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_user_context TO authenticated;

CREATE OR REPLACE FUNCTION public.get_booking_stats(p_facility_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_upcoming_birthdays integer;
  v_upcoming_football integer;
  v_this_month_total integer;
BEGIN
  SELECT COUNT(*)::integer INTO v_upcoming_birthdays FROM bookings
  WHERE facility_id = p_facility_id AND type = 'birthday' AND starts_at >= NOW() AND status = 'confirmed';

  SELECT COUNT(*)::integer INTO v_upcoming_football FROM bookings
  WHERE facility_id = p_facility_id AND type = 'football' AND starts_at >= NOW() AND status = 'confirmed';

  SELECT COUNT(*)::integer INTO v_this_month_total FROM bookings
  WHERE facility_id = p_facility_id AND starts_at >= date_trunc('month', CURRENT_DATE);

  RETURN jsonb_build_object('upcomingBirthdays', v_upcoming_birthdays, 'upcomingFootball', v_upcoming_football, 'thisMonthTotal', v_this_month_total);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_booking_stats TO authenticated;

CREATE OR REPLACE FUNCTION public.get_revenue_stats(
  p_facility_id uuid, p_start_date timestamptz, p_end_date timestamptz
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_revenue', COALESCE(SUM(total_amount), 0),
    'order_count', COUNT(*),
    'avg_order_value', COALESCE(ROUND(AVG(total_amount)::numeric, 2), 0),
    'total_discount', COALESCE(SUM(discount_amount), 0)
  ) INTO v_result FROM orders
  WHERE facility_id = p_facility_id AND created_at BETWEEN p_start_date AND p_end_date;

  v_result := v_result || jsonb_build_object('top_products', (
    SELECT COALESCE(jsonb_agg(jsonb_build_object('name', product_name, 'quantity', total_qty, 'revenue', total_rev)), '[]'::jsonb)
    FROM (
      SELECT oi.product_name, SUM(oi.quantity) as total_qty, SUM(oi.line_total) as total_rev
      FROM orders o JOIN order_items oi ON o.id = oi.order_id
      WHERE o.facility_id = p_facility_id AND o.created_at BETWEEN p_start_date AND p_end_date AND NOT oi.is_deleted
      GROUP BY oi.product_name ORDER BY total_qty DESC LIMIT 5
    ) top
  ));
  RETURN v_result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_revenue_stats TO authenticated;

-- Revoke PUBLIC (anon) execute from all app functions — authenticated only
REVOKE EXECUTE ON FUNCTION public.check_booking_conflict(uuid, public.booking_type, timestamptz, timestamptz, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.close_register_session(uuid, uuid, numeric, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_order(uuid, uuid, uuid, jsonb, integer, numeric) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_booking_stats(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_dashboard_data(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_register_sessions(uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_revenue_stats(uuid, timestamptz, timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_context(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_facility_access(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_facility_admin(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_facility_ids() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_tenant_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_booking_conflict TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_facility_access TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_facility_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_facility_ids TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_tenant_ids TO authenticated;
