-- Functions & Triggers

BEGIN;

-- ============================================================
-- Helper: auto-update updated_at
-- ============================================================
CREATE FUNCTION public.handle_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- updated_at triggers for all tables that have the column
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.facilities
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- Helper: sync auth.users → public.users on signup
-- ============================================================
CREATE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name  = COALESCE(EXCLUDED.full_name, users.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Helper: maintain products.search_vector automatically
-- Uses 'simple' dictionary — language-agnostic (works for Greek, English, etc.)
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

-- ============================================================
-- Helper: get user's tenant IDs (used by RLS policies)
-- ============================================================
CREATE FUNCTION public.user_tenant_ids() RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT tenant_id FROM memberships WHERE user_id = auth.uid();
$$;

-- ============================================================
-- Helper: get user's accessible facility IDs (used by RLS policies)
-- A tenant-wide membership (facility_id IS NULL) grants access to all
-- facilities under that tenant.
-- ============================================================
CREATE FUNCTION public.user_facility_ids() RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT f.id
  FROM facilities f
  JOIN memberships m ON m.tenant_id = f.tenant_id
  WHERE m.user_id = auth.uid()
    AND (m.facility_id IS NULL OR m.facility_id = f.id);
$$;

-- ============================================================
-- Helper: check if the current user can access a given facility
-- ============================================================
CREATE FUNCTION public.has_facility_access(fid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM user_facility_ids() AS id WHERE id = fid);
$$;

-- ============================================================
-- Helper: check if current user is admin/owner for a given facility
-- ============================================================
CREATE FUNCTION public.is_facility_admin(fid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM memberships m
    JOIN facilities f ON f.tenant_id = m.tenant_id
    WHERE m.user_id = auth.uid()
      AND f.id = fid
      AND m.role IN ('owner', 'admin')
      AND (m.facility_id IS NULL OR m.facility_id = fid)
  );
$$;

-- ============================================================
-- Trigger: update product stock on order_item INSERT/UPDATE
-- Handles four cases:
--   INSERT non-deleted   → decrement stock
--   UPDATE delete        → restore stock (soft-delete)
--   UPDATE restore       → decrement stock (un-delete)
--   UPDATE qty change    → adjust delta
-- Only applies when track_inventory = true.
-- ============================================================
CREATE FUNCTION public.update_product_stock() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NOT NEW.is_deleted THEN
    UPDATE products SET stock_quantity = stock_quantity - NEW.quantity
    WHERE id = NEW.product_id AND track_inventory;

  ELSIF TG_OP = 'UPDATE' THEN
    IF NOT OLD.is_deleted AND NEW.is_deleted THEN
      -- Soft-deleted: restore stock
      UPDATE products SET stock_quantity = stock_quantity + OLD.quantity
      WHERE id = NEW.product_id AND track_inventory;
    ELSIF OLD.is_deleted AND NOT NEW.is_deleted THEN
      -- Un-deleted: decrement stock
      UPDATE products SET stock_quantity = stock_quantity - NEW.quantity
      WHERE id = NEW.product_id AND track_inventory;
    ELSIF OLD.quantity != NEW.quantity AND NOT NEW.is_deleted THEN
      -- Quantity changed: apply delta
      UPDATE products SET stock_quantity = stock_quantity + OLD.quantity - NEW.quantity
      WHERE id = NEW.product_id AND track_inventory;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_order_item_change
  AFTER INSERT OR UPDATE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.update_product_stock();

-- ============================================================
-- Audit trigger — records INSERT/UPDATE/DELETE on key tables.
-- tenant_id is resolved via a facility_id or tenant_id column
-- on the audited table so audit_log rows are RLS-scopeable.
-- ============================================================
CREATE FUNCTION public.audit_trigger() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant_id uuid;
  v_record_data jsonb;
BEGIN
  -- Resolve tenant_id from the audited row
  v_record_data := CASE TG_OP WHEN 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;

  IF v_record_data ? 'tenant_id' THEN
    v_tenant_id := (v_record_data->>'tenant_id')::uuid;
  ELSIF v_record_data ? 'facility_id' THEN
    SELECT tenant_id INTO v_tenant_id
    FROM facilities WHERE id = (v_record_data->>'facility_id')::uuid;
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log(tenant_id, table_name, record_id, action, old_data, changed_by)
    VALUES (v_tenant_id, TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log(tenant_id, table_name, record_id, action, old_data, new_data, changed_by)
    VALUES (v_tenant_id, TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log(tenant_id, table_name, record_id, action, new_data, changed_by)
    VALUES (v_tenant_id, TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  END IF;
END;
$$;

-- Audit triggers: orders, bookings, products, memberships, register_sessions
CREATE TRIGGER audit_orders
  AFTER INSERT OR UPDATE OR DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_bookings
  AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_products
  AFTER INSERT OR UPDATE OR DELETE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_memberships
  AFTER INSERT OR UPDATE OR DELETE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_register_sessions
  AFTER INSERT OR UPDATE OR DELETE ON public.register_sessions
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- ============================================================
-- RPC: create_order — atomic POS transaction
--
-- Parses p_items jsonb once into a temp table, validates product
-- existence and stock, inserts order + items, deducts stock via trigger.
-- Returns float8 values so the app never needs Number() coercion.
-- FOR UPDATE lock on session row prevents double-submit race conditions.
-- ============================================================
CREATE FUNCTION public.create_order(
  p_facility_id  uuid,
  p_session_id   uuid,
  p_user_id      uuid,
  p_items        jsonb,
  p_coupon_count integer DEFAULT 0,
  p_coupon_value numeric  DEFAULT 0.50
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order_id uuid;
  v_subtotal numeric(10,2);
  v_discount numeric(10,2);
  v_total    numeric(10,2);
BEGIN
  -- Lock session row — prevents concurrent double-submit
  PERFORM 1 FROM register_sessions
  WHERE id = p_session_id AND facility_id = p_facility_id AND closed_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'No active register session');
  END IF;

  -- Parse jsonb once, join products — single table scan
  CREATE TEMP TABLE _order_items ON COMMIT DROP AS
  SELECT
    i.product_id,
    i.quantity,
    i.unit_price,
    COALESCE(i.is_treat, false) AS is_treat,
    p.name                      AS product_name,
    p.track_inventory,
    p.stock_quantity,
    CASE WHEN COALESCE(i.is_treat, false) THEN 0::numeric
         ELSE i.unit_price * i.quantity END AS line_total
  FROM jsonb_to_recordset(p_items)
         AS i(product_id uuid, quantity int, unit_price numeric, is_treat boolean)
  JOIN products p ON p.id = i.product_id AND p.facility_id = p_facility_id;

  -- Validate: all products found
  IF (SELECT COUNT(*) FROM jsonb_to_recordset(p_items)
        AS i(product_id uuid, quantity int, unit_price numeric, is_treat boolean))
     > (SELECT COUNT(*) FROM _order_items) THEN
    RETURN jsonb_build_object('error', 'Product not found');
  END IF;

  -- Validate: sufficient stock (only for tracked products)
  IF EXISTS (
    SELECT 1 FROM _order_items WHERE track_inventory AND stock_quantity < quantity
  ) THEN
    RETURN jsonb_build_object('error', 'Insufficient stock');
  END IF;

  SELECT COALESCE(SUM(line_total), 0) INTO v_subtotal FROM _order_items;

  v_discount := p_coupon_count * p_coupon_value;
  v_total    := GREATEST(0, v_subtotal - v_discount);

  INSERT INTO orders (facility_id, session_id, subtotal, discount_amount, total_amount, coupon_count, created_by)
  VALUES (p_facility_id, p_session_id, v_subtotal, v_discount, v_total, p_coupon_count, p_user_id)
  RETURNING id INTO v_order_id;

  INSERT INTO order_items (order_id, facility_id, product_id, product_name, quantity, unit_price, line_total, is_treat)
  SELECT v_order_id, p_facility_id, product_id, product_name, quantity, unit_price, line_total, is_treat
  FROM _order_items;

  RETURN jsonb_build_object(
    'id',              v_order_id,
    'subtotal',        v_subtotal::float8,
    'discount_amount', v_discount::float8,
    'total_amount',    v_total::float8
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order TO authenticated;

-- ============================================================
-- RPC: close_register_session
--
-- FOR UPDATE lock prevents concurrent double-close.
-- Returns float8 values for direct use in the app.
-- ============================================================
CREATE FUNCTION public.close_register_session(
  p_session_id   uuid,
  p_user_id      uuid,
  p_closing_cash numeric,
  p_notes        text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_session  record;
  v_expected numeric(10,2);
BEGIN
  -- Lock row — prevents concurrent double-close
  SELECT * INTO v_session FROM register_sessions
  WHERE id = p_session_id AND closed_at IS NULL
  FOR UPDATE;

  IF v_session IS NULL THEN
    RETURN jsonb_build_object('error', 'Session not found or already closed');
  END IF;

  SELECT COALESCE(SUM(total_amount), 0) + v_session.opening_cash
  INTO v_expected
  FROM orders WHERE session_id = p_session_id;

  UPDATE register_sessions
  SET
    closed_at     = now(),
    closed_by     = p_user_id,
    closing_cash  = p_closing_cash,
    expected_cash = v_expected,
    notes         = p_notes
  WHERE id = p_session_id;

  RETURN jsonb_build_object(
    'id',            p_session_id,
    'expected_cash', v_expected::float8,
    'closing_cash',  p_closing_cash::float8,
    'variance',      (p_closing_cash - v_expected)::float8
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.close_register_session TO authenticated;

-- ============================================================
-- RPC: search_products
-- Uses tsvector (maintained by trigger) with trigram ILIKE fallback.
-- 'simple' dictionary is language-agnostic (Greek + English both work).
-- ============================================================
CREATE FUNCTION public.search_products(facility_uuid uuid, search_text text)
RETURNS TABLE(id uuid, name text, price numeric, stock_quantity integer, category_id uuid, rank real)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT
    p.id, p.name, p.price, p.stock_quantity, p.category_id,
    CASE
      WHEN search_text = '' THEN 0
      ELSE ts_rank(p.search_vector, plainto_tsquery('simple', search_text))
    END AS rank
  FROM products p
  WHERE p.facility_id = facility_uuid
    AND (
      search_text = ''
      OR p.search_vector @@ plainto_tsquery('simple', search_text)
      OR p.name ILIKE '%' || search_text || '%'
    )
  ORDER BY rank DESC, p.name;
$$;

GRANT EXECUTE ON FUNCTION public.search_products TO authenticated;

-- ============================================================
-- RPC: refresh_mv_best_sellers
-- Called by the keep-alive cron job (daily). CONCURRENTLY means
-- the view remains readable during refresh.
-- ============================================================
CREATE FUNCTION public.refresh_mv_best_sellers() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_best_sellers;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_mv_best_sellers TO service_role;

COMMIT;
