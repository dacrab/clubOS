-- Functions & Triggers

BEGIN;

-- Helper: get user's tenant IDs
CREATE FUNCTION public.user_tenant_ids() RETURNS SETOF uuid 
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT tenant_id FROM memberships WHERE user_id = auth.uid();
$$;

-- Helper: get user's facility IDs
CREATE FUNCTION public.user_facility_ids() RETURNS SETOF uuid 
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT f.id FROM facilities f
  JOIN memberships m ON m.tenant_id = f.tenant_id
  WHERE m.user_id = auth.uid() AND (m.facility_id IS NULL OR m.facility_id = f.id);
$$;

-- Helper: check facility access
CREATE FUNCTION public.has_facility_access(fid uuid) RETURNS boolean 
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM user_facility_ids() AS id WHERE id = fid);
$$;

-- Helper: check if user is admin for facility
CREATE FUNCTION public.is_facility_admin(fid uuid) RETURNS boolean 
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships m JOIN facilities f ON f.tenant_id = m.tenant_id
    WHERE m.user_id = auth.uid() AND f.id = fid AND m.role IN ('owner', 'admin')
    AND (m.facility_id IS NULL OR m.facility_id = fid)
  );
$$;

-- Trigger: auto-update updated_at
CREATE FUNCTION public.handle_updated_at() RETURNS trigger 
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Trigger: sync auth.users to public.users
CREATE FUNCTION public.handle_new_user() RETURNS trigger 
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (id, full_name, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'), NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url);
  RETURN NEW;
END;
$$;

-- Trigger: update stock on order item changes
CREATE FUNCTION public.update_product_stock() RETURNS trigger 
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NOT NEW.is_deleted THEN
    UPDATE products SET stock_quantity = stock_quantity - NEW.quantity WHERE id = NEW.product_id AND track_inventory;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NOT OLD.is_deleted AND NEW.is_deleted THEN
      UPDATE products SET stock_quantity = stock_quantity + OLD.quantity WHERE id = NEW.product_id AND track_inventory;
    ELSIF OLD.is_deleted AND NOT NEW.is_deleted THEN
      UPDATE products SET stock_quantity = stock_quantity - NEW.quantity WHERE id = NEW.product_id AND track_inventory;
    ELSIF OLD.quantity != NEW.quantity AND NOT NEW.is_deleted THEN
      UPDATE products SET stock_quantity = stock_quantity + OLD.quantity - NEW.quantity WHERE id = NEW.product_id AND track_inventory;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- RPC: create order atomically
CREATE FUNCTION public.create_order(
  p_facility_id uuid, p_session_id uuid, p_user_id uuid, p_items jsonb, 
  p_coupon_count integer DEFAULT 0, p_coupon_value numeric DEFAULT 0.50
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

-- RPC: close register session
CREATE FUNCTION public.close_register_session(
  p_session_id uuid, p_user_id uuid, p_closing_cash numeric, p_notes text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_session record;
  v_expected numeric(10,2);
  v_summary jsonb;
BEGIN
  SELECT * INTO v_session FROM register_sessions WHERE id = p_session_id AND closed_at IS NULL;
  IF v_session IS NULL THEN RETURN jsonb_build_object('error', 'Session not found or already closed'); END IF;

  SELECT COALESCE(SUM(total_amount), 0) + v_session.opening_cash INTO v_expected FROM orders WHERE session_id = p_session_id;

  SELECT jsonb_build_object(
    'orders_count', COUNT(*), 'total_sales', COALESCE(SUM(total_amount), 0),
    'total_discount', COALESCE(SUM(discount_amount), 0), 'coupons_used', COALESCE(SUM(coupon_count), 0),
    'cash_variance', p_closing_cash - v_expected
  ) INTO v_summary FROM orders WHERE session_id = p_session_id;

  UPDATE register_sessions 
  SET closed_at = now(), closed_by = p_user_id, closing_cash = p_closing_cash, 
      expected_cash = v_expected, notes = p_notes, summary = v_summary
  WHERE id = p_session_id;

  RETURN jsonb_build_object('id', p_session_id, 'expected_cash', v_expected, 'closing_cash', p_closing_cash, 'variance', p_closing_cash - v_expected, 'summary', v_summary);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_register_session TO authenticated;

-- Triggers
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.facilities FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER on_order_item_change AFTER INSERT OR UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.update_product_stock();

COMMIT;
