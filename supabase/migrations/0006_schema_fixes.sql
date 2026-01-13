-- Schema fixes: naming, constraints, spelling consistency

BEGIN;

-- 1. Rename keep-alive to keep_alive
ALTER TABLE public."keep-alive" RENAME TO keep_alive;

-- 2. Fix spelling inconsistency: use 'canceled' (American) everywhere
ALTER TYPE public.booking_status RENAME VALUE 'cancelled' TO 'canceled';

-- 3. Add missing CHECK constraints
ALTER TABLE public.products ADD CONSTRAINT products_stock_quantity_check CHECK (stock_quantity >= 0);
ALTER TABLE public.bookings ADD CONSTRAINT bookings_deposit_amount_check CHECK (deposit_amount IS NULL OR deposit_amount >= 0);
ALTER TABLE public.bookings ADD CONSTRAINT bookings_total_price_check CHECK (total_price IS NULL OR total_price >= 0);
ALTER TABLE public.order_items ADD CONSTRAINT order_items_line_total_check CHECK (line_total >= 0);

-- 4. Fix register_sessions: opened_at should be NULL until first order
-- created_at = when session record was created (manual open)
-- opened_at = when first order was placed (auto-set by create_order)
ALTER TABLE public.register_sessions ALTER COLUMN opened_at DROP NOT NULL;
ALTER TABLE public.register_sessions ALTER COLUMN opened_at DROP DEFAULT;
COMMENT ON COLUMN public.register_sessions.created_at IS 'When the register session was created/opened by staff';
COMMENT ON COLUMN public.register_sessions.opened_at IS 'When the first order was placed (auto-set)';

-- 5. Fix memberships unique constraint to handle NULL facility_id properly
ALTER TABLE public.memberships DROP CONSTRAINT memberships_user_id_tenant_id_facility_id_key;
CREATE UNIQUE INDEX memberships_user_tenant_facility_idx ON public.memberships (user_id, tenant_id, COALESCE(facility_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- 6. Update RLS policy for renamed table
DROP POLICY IF EXISTS "service_role_only" ON public.keep_alive;
CREATE POLICY "service_role_only" ON public.keep_alive FOR ALL USING ((SELECT auth.role()) = 'service_role');

-- 7. Update create_order function to auto-set opened_at on first order
CREATE OR REPLACE FUNCTION public.create_order(p_facility_id uuid, p_session_id uuid, p_user_id uuid, p_items jsonb, p_coupon_count integer DEFAULT 0, p_coupon_value numeric DEFAULT 0.50)
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

  -- Auto-set opened_at on first order
  UPDATE register_sessions SET opened_at = now() WHERE id = p_session_id AND opened_at IS NULL;

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

COMMIT;
