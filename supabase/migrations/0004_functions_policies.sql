-- Functions, Triggers & RLS Policies

BEGIN;

-- Helper: get user's tenant IDs
CREATE FUNCTION public.user_tenant_ids() RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT tenant_id FROM memberships WHERE user_id = (SELECT auth.uid());
$$;

-- Helper: get user's facility IDs
CREATE FUNCTION public.user_facility_ids() RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT f.id FROM facilities f
  JOIN memberships m ON m.tenant_id = f.tenant_id
  WHERE m.user_id = (SELECT auth.uid()) AND (m.facility_id IS NULL OR m.facility_id = f.id);
$$;

-- Helper: check facility access
CREATE FUNCTION public.has_facility_access(fid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_facility_ids() WHERE user_facility_ids = fid);
$$;

-- Helper: check if user is admin for facility
CREATE FUNCTION public.is_facility_admin(fid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships m JOIN facilities f ON f.tenant_id = m.tenant_id
    WHERE m.user_id = (SELECT auth.uid()) AND f.id = fid AND m.role IN ('owner', 'admin')
    AND (m.facility_id IS NULL OR m.facility_id = fid)
  );
$$;

-- Trigger: updated_at
CREATE FUNCTION public.handle_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Trigger: sync auth.users to public.users
CREATE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
CREATE FUNCTION public.update_product_stock() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
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
CREATE FUNCTION public.create_order(p_facility_id uuid, p_session_id uuid, p_user_id uuid, p_items jsonb, p_coupon_count integer DEFAULT 0, p_coupon_value numeric DEFAULT 0.50)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order_id uuid;
  v_subtotal numeric(10,2) := 0;
  v_discount numeric(10,2);
  v_total numeric(10,2);
  v_item jsonb;
  v_product record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM register_sessions WHERE id = p_session_id AND facility_id = p_facility_id AND closed_at IS NULL) THEN
    RETURN jsonb_build_object('error', 'No active register session');
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO v_product FROM products WHERE id = (v_item->>'product_id')::uuid AND facility_id = p_facility_id;
    IF v_product IS NULL THEN RETURN jsonb_build_object('error', 'Product not found'); END IF;
    IF v_product.track_inventory AND v_product.stock_quantity < (v_item->>'quantity')::integer THEN
      RETURN jsonb_build_object('error', 'Insufficient stock for: ' || v_product.name);
    END IF;
    IF NOT COALESCE((v_item->>'is_treat')::boolean, false) THEN
      v_subtotal := v_subtotal + (v_item->>'unit_price')::numeric * (v_item->>'quantity')::integer;
    END IF;
  END LOOP;

  v_discount := p_coupon_count * p_coupon_value;
  v_total := GREATEST(0, v_subtotal - v_discount);

  INSERT INTO orders (facility_id, session_id, subtotal, discount_amount, total_amount, coupon_count, created_by)
  VALUES (p_facility_id, p_session_id, v_subtotal, v_discount, v_total, p_coupon_count, p_user_id)
  RETURNING id INTO v_order_id;

  INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, line_total, is_treat)
  SELECT v_order_id, (item->>'product_id')::uuid, p.name, (item->>'quantity')::integer, (item->>'unit_price')::numeric,
    CASE WHEN COALESCE((item->>'is_treat')::boolean, false) THEN 0 ELSE (item->>'unit_price')::numeric * (item->>'quantity')::integer END,
    COALESCE((item->>'is_treat')::boolean, false)
  FROM jsonb_array_elements(p_items) item JOIN products p ON p.id = (item->>'product_id')::uuid;

  RETURN jsonb_build_object('id', v_order_id, 'subtotal', v_subtotal, 'discount_amount', v_discount, 'total_amount', v_total);
END;
$$;

-- RPC: close register session
CREATE FUNCTION public.close_register_session(p_session_id uuid, p_user_id uuid, p_closing_cash numeric, p_notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

  UPDATE register_sessions SET closed_at = now(), closed_by = p_user_id, closing_cash = p_closing_cash, expected_cash = v_expected, notes = p_notes, summary = v_summary
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

-- RLS Policies
CREATE POLICY tenants_select ON public.tenants FOR SELECT USING ((SELECT auth.role()) = 'service_role' OR id IN (SELECT user_tenant_ids()));
CREATE POLICY tenants_insert ON public.tenants FOR INSERT WITH CHECK ((SELECT auth.role()) = 'service_role');
CREATE POLICY tenants_update ON public.tenants FOR UPDATE USING ((SELECT auth.role()) = 'service_role' OR id IN (SELECT tenant_id FROM memberships WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin')));
CREATE POLICY tenants_delete ON public.tenants FOR DELETE USING ((SELECT auth.role()) = 'service_role');

CREATE POLICY subscriptions_select ON public.subscriptions FOR SELECT USING ((SELECT auth.role()) = 'service_role' OR tenant_id IN (SELECT user_tenant_ids()));
CREATE POLICY subscriptions_insert ON public.subscriptions FOR INSERT WITH CHECK ((SELECT auth.role()) = 'service_role');
CREATE POLICY subscriptions_update ON public.subscriptions FOR UPDATE USING ((SELECT auth.role()) = 'service_role');
CREATE POLICY subscriptions_delete ON public.subscriptions FOR DELETE USING ((SELECT auth.role()) = 'service_role');

CREATE POLICY facilities_select ON public.facilities FOR SELECT USING ((SELECT auth.role()) = 'service_role' OR id IN (SELECT user_facility_ids()));
CREATE POLICY facilities_insert ON public.facilities FOR INSERT WITH CHECK ((SELECT auth.role()) = 'service_role' OR is_facility_admin(id));
CREATE POLICY facilities_update ON public.facilities FOR UPDATE USING ((SELECT auth.role()) = 'service_role' OR is_facility_admin(id));
CREATE POLICY facilities_delete ON public.facilities FOR DELETE USING ((SELECT auth.role()) = 'service_role' OR is_facility_admin(id));

CREATE POLICY users_select ON public.users FOR SELECT USING ((SELECT auth.role()) = 'service_role' OR id = (SELECT auth.uid()) OR id IN (SELECT m2.user_id FROM memberships m1 JOIN memberships m2 ON m1.tenant_id = m2.tenant_id WHERE m1.user_id = (SELECT auth.uid())));
CREATE POLICY users_insert ON public.users FOR INSERT WITH CHECK ((SELECT auth.role()) = 'service_role');
CREATE POLICY users_update ON public.users FOR UPDATE USING ((SELECT auth.role()) = 'service_role' OR id = (SELECT auth.uid()));
CREATE POLICY users_delete ON public.users FOR DELETE USING ((SELECT auth.role()) = 'service_role');

CREATE POLICY memberships_select ON public.memberships FOR SELECT USING ((SELECT auth.role()) = 'service_role' OR user_id = (SELECT auth.uid()) OR tenant_id IN (SELECT user_tenant_ids()));
CREATE POLICY memberships_insert ON public.memberships FOR INSERT WITH CHECK ((SELECT auth.role()) = 'service_role' OR tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin')));
CREATE POLICY memberships_update ON public.memberships FOR UPDATE USING ((SELECT auth.role()) = 'service_role' OR tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin')));
CREATE POLICY memberships_delete ON public.memberships FOR DELETE USING ((SELECT auth.role()) = 'service_role' OR tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin')));

CREATE POLICY categories_select ON public.categories FOR SELECT USING (has_facility_access(facility_id));
CREATE POLICY categories_insert ON public.categories FOR INSERT WITH CHECK (is_facility_admin(facility_id));
CREATE POLICY categories_update ON public.categories FOR UPDATE USING (is_facility_admin(facility_id));
CREATE POLICY categories_delete ON public.categories FOR DELETE USING (is_facility_admin(facility_id));

CREATE POLICY products_select ON public.products FOR SELECT USING (has_facility_access(facility_id));
CREATE POLICY products_insert ON public.products FOR INSERT WITH CHECK (is_facility_admin(facility_id));
CREATE POLICY products_update ON public.products FOR UPDATE USING (is_facility_admin(facility_id));
CREATE POLICY products_delete ON public.products FOR DELETE USING (is_facility_admin(facility_id));

CREATE POLICY register_sessions_select ON public.register_sessions FOR SELECT USING (has_facility_access(facility_id));
CREATE POLICY register_sessions_insert ON public.register_sessions FOR INSERT WITH CHECK (has_facility_access(facility_id));
CREATE POLICY register_sessions_update ON public.register_sessions FOR UPDATE USING (has_facility_access(facility_id) AND (opened_by = (SELECT auth.uid()) OR is_facility_admin(facility_id)));

CREATE POLICY orders_select ON public.orders FOR SELECT USING (has_facility_access(facility_id));
CREATE POLICY orders_insert ON public.orders FOR INSERT WITH CHECK (has_facility_access(facility_id));
CREATE POLICY orders_update ON public.orders FOR UPDATE USING (has_facility_access(facility_id) AND (created_by = (SELECT auth.uid()) OR is_facility_admin(facility_id)));

CREATE POLICY order_items_all ON public.order_items FOR ALL USING (order_id IN (SELECT id FROM orders WHERE has_facility_access(facility_id)));

CREATE POLICY bookings_select ON public.bookings FOR SELECT USING (has_facility_access(facility_id));
CREATE POLICY bookings_insert ON public.bookings FOR INSERT WITH CHECK (has_facility_access(facility_id));
CREATE POLICY bookings_update ON public.bookings FOR UPDATE USING (has_facility_access(facility_id));
CREATE POLICY bookings_delete ON public.bookings FOR DELETE USING (is_facility_admin(facility_id));

COMMIT;
