-- ============================================================================
-- ClubOS Database Schema v2.0
-- Migration 10: Functions and Triggers
-- ============================================================================

BEGIN;

-- ============================================================================
-- Timestamp Management
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger 
LANGUAGE plpgsql 
SET search_path = '' 
AS $$
BEGIN 
  NEW.updated_at = now(); 
  RETURN NEW; 
END;
$$;

COMMENT ON FUNCTION public.update_updated_at IS 'Automatically update updated_at timestamp';

-- Apply to all tables with updated_at
CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER tenants_updated_at BEFORE UPDATE ON public.tenants 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER facilities_updated_at BEFORE UPDATE ON public.facilities 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER categories_updated_at BEFORE UPDATE ON public.categories 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER register_sessions_updated_at BEFORE UPDATE ON public.register_sessions 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER order_items_updated_at BEFORE UPDATE ON public.order_items 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER register_closings_updated_at BEFORE UPDATE ON public.register_closings 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER appointments_updated_at BEFORE UPDATE ON public.appointments 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER football_bookings_updated_at BEFORE UPDATE ON public.football_bookings 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER tenant_settings_updated_at BEFORE UPDATE ON public.tenant_settings 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER user_preferences_updated_at BEFORE UPDATE ON public.user_preferences 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- Auth Integration
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = '' 
AS $$
DECLARE 
  v_username text;
  v_role public.user_role := 'staff';
  v_email text;
  v_full_name text;
BEGIN
  -- Extract user data from auth metadata
  v_username := COALESCE(
    NEW.raw_user_meta_data->>'username', 
    split_part(NEW.email, '@', 1),
    'user_' || substr(NEW.id::text, 1, 8)
  );
  v_email := NEW.email;
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name'
  );
  
  -- Parse role from metadata if valid
  IF (NEW.raw_user_meta_data->>'role') IN ('admin', 'staff', 'secretary') THEN
    v_role := (NEW.raw_user_meta_data->>'role')::public.user_role;
  END IF;
  
  -- Insert into public.users
  INSERT INTO public.users (id, username, email, full_name, role) 
  VALUES (NEW.id, v_username, v_email, v_full_name, v_role)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
    updated_at = now();
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN 
  RAISE WARNING 'Failed to create user record: %', SQLERRM;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user IS 'Creates a public.users record when auth.users is created';

CREATE TRIGGER on_auth_user_created 
  AFTER INSERT ON auth.users 
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- Data Integrity Functions
-- ============================================================================

-- Ensure category parent belongs to same tenant/facility
CREATE OR REPLACE FUNCTION public.check_category_parent()
RETURNS trigger 
LANGUAGE plpgsql 
SET search_path = '' 
AS $$
DECLARE 
  v_parent record;
BEGIN
  IF NEW.parent_id IS NULL THEN 
    RETURN NEW; 
  END IF;
  
  SELECT tenant_id, facility_id INTO v_parent 
  FROM public.categories WHERE id = NEW.parent_id;
  
  IF v_parent IS NULL THEN
    RAISE EXCEPTION 'Parent category does not exist';
  END IF;
  
  IF v_parent.tenant_id != NEW.tenant_id OR v_parent.facility_id != NEW.facility_id THEN
    RAISE EXCEPTION 'Parent category must belong to the same tenant and facility';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER categories_check_parent 
  BEFORE INSERT OR UPDATE ON public.categories 
  FOR EACH ROW EXECUTE FUNCTION public.check_category_parent();

-- Ensure product category belongs to same tenant/facility
CREATE OR REPLACE FUNCTION public.check_product_category()
RETURNS trigger 
LANGUAGE plpgsql 
SET search_path = '' 
AS $$
DECLARE 
  v_category record;
BEGIN
  IF NEW.category_id IS NULL THEN 
    RETURN NEW; 
  END IF;
  
  SELECT tenant_id, facility_id INTO v_category 
  FROM public.categories WHERE id = NEW.category_id;
  
  IF v_category IS NULL THEN
    RAISE EXCEPTION 'Category does not exist';
  END IF;
  
  IF v_category.tenant_id != NEW.tenant_id OR v_category.facility_id != NEW.facility_id THEN
    RAISE EXCEPTION 'Product category must belong to the same tenant and facility';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER products_check_category 
  BEFORE INSERT OR UPDATE ON public.products 
  FOR EACH ROW EXECUTE FUNCTION public.check_product_category();

-- Ensure facility belongs to tenant
CREATE OR REPLACE FUNCTION public.check_facility_tenant()
RETURNS trigger 
LANGUAGE plpgsql 
SET search_path = '' 
AS $$
DECLARE 
  v_facility_tenant uuid;
BEGIN
  IF NEW.facility_id IS NULL THEN 
    RETURN NEW; 
  END IF;
  
  SELECT tenant_id INTO v_facility_tenant 
  FROM public.facilities WHERE id = NEW.facility_id;
  
  IF v_facility_tenant IS NULL OR v_facility_tenant != NEW.tenant_id THEN
    RAISE EXCEPTION 'Facility must belong to the specified tenant';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply facility/tenant check to relevant tables
CREATE TRIGGER categories_check_facility 
  BEFORE INSERT OR UPDATE ON public.categories 
  FOR EACH ROW EXECUTE FUNCTION public.check_facility_tenant();
CREATE TRIGGER products_check_facility 
  BEFORE INSERT OR UPDATE ON public.products 
  FOR EACH ROW EXECUTE FUNCTION public.check_facility_tenant();
CREATE TRIGGER sessions_check_facility 
  BEFORE INSERT OR UPDATE ON public.register_sessions 
  FOR EACH ROW EXECUTE FUNCTION public.check_facility_tenant();
CREATE TRIGGER orders_check_facility 
  BEFORE INSERT OR UPDATE ON public.orders 
  FOR EACH ROW EXECUTE FUNCTION public.check_facility_tenant();
CREATE TRIGGER appointments_check_facility 
  BEFORE INSERT OR UPDATE ON public.appointments 
  FOR EACH ROW EXECUTE FUNCTION public.check_facility_tenant();
CREATE TRIGGER football_check_facility 
  BEFORE INSERT OR UPDATE ON public.football_bookings 
  FOR EACH ROW EXECUTE FUNCTION public.check_facility_tenant();

-- ============================================================================
-- Booking Overlap Prevention
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_appointment_overlap()
RETURNS trigger 
LANGUAGE plpgsql 
SET search_path = '' 
AS $$
DECLARE
  v_end_date timestamptz;
  v_overlap_count integer;
BEGIN
  -- Skip if cancelled
  IF NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;
  
  -- Calculate end date
  v_end_date := COALESCE(NEW.end_date, NEW.appointment_date + (NEW.duration_minutes || ' minutes')::interval);
  
  -- Check for overlaps
  SELECT COUNT(*) INTO v_overlap_count
  FROM public.appointments
  WHERE facility_id = NEW.facility_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND status NOT IN ('cancelled')
    AND (
      (appointment_date, COALESCE(end_date, appointment_date + (duration_minutes || ' minutes')::interval))
      OVERLAPS
      (NEW.appointment_date, v_end_date)
    );
  
  IF v_overlap_count > 0 THEN
    RAISE EXCEPTION 'Appointment overlaps with existing booking';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Only enable if prevent_overlaps is true (check in app layer for flexibility)
-- CREATE TRIGGER appointments_check_overlap 
--   BEFORE INSERT OR UPDATE ON public.appointments 
--   FOR EACH ROW EXECUTE FUNCTION public.check_appointment_overlap();

-- ============================================================================
-- Register Session Management
-- ============================================================================

CREATE OR REPLACE FUNCTION public.close_register_session(
  p_session_id uuid, 
  p_closing_cash numeric DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid 
LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = '' 
AS $$
DECLARE 
  v_closing_id uuid;
  v_session record;
  v_stats record;
BEGIN
  -- Get session info
  SELECT * INTO v_session 
  FROM public.register_sessions 
  WHERE id = p_session_id AND closed_at IS NULL;
  
  IF v_session IS NULL THEN
    RAISE EXCEPTION 'Register session not found or already closed';
  END IF;
  
  -- Calculate session statistics
  SELECT 
    COUNT(*) AS orders_count,
    COALESCE(SUM(total_amount), 0) AS orders_total,
    COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END), 0) AS cash_total,
    COALESCE(SUM(CASE WHEN payment_method = 'card' THEN total_amount ELSE 0 END), 0) AS card_total,
    COALESCE(SUM(CASE WHEN payment_method = 'coupon' THEN total_amount ELSE 0 END), 0) AS coupon_total,
    COALESCE(SUM(discount_amount), 0) AS discount_total,
    COALESCE(SUM(CASE WHEN status = 'refunded' THEN total_amount ELSE 0 END), 0) AS refund_total,
    COUNT(CASE WHEN status = 'refunded' THEN 1 END) AS refund_count
  INTO v_stats 
  FROM public.orders 
  WHERE session_id = p_session_id AND status != 'voided';
  
  -- Calculate treat statistics
  SELECT 
    COUNT(*) AS treat_count,
    COALESCE(SUM(unit_price * quantity), 0) AS treat_value
  INTO v_stats.treat_count, v_stats.treat_value
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE o.session_id = p_session_id AND oi.is_treat = true;
  
  -- Calculate expected cash
  v_stats.expected_cash := v_session.opening_cash + v_stats.cash_total - v_stats.refund_total;

  -- Create closing record
  INSERT INTO public.register_closings (
    session_id, orders_count, orders_total, cash_total, card_total, coupon_total,
    treat_count, treat_value, discount_total, refund_count, refund_total, notes
  )
  VALUES (
    p_session_id, v_stats.orders_count, v_stats.orders_total, v_stats.cash_total,
    v_stats.card_total, v_stats.coupon_total, v_stats.treat_count, v_stats.treat_value,
    v_stats.discount_total, v_stats.refund_count, v_stats.refund_total, p_notes
  )
  RETURNING id INTO v_closing_id;

  -- Close the session
  UPDATE public.register_sessions 
  SET 
    closed_at = now(),
    closed_by = auth.uid(),
    closing_cash = p_closing_cash,
    expected_cash = v_stats.expected_cash,
    cash_difference = CASE WHEN p_closing_cash IS NOT NULL 
      THEN p_closing_cash - v_stats.expected_cash 
      ELSE NULL END,
    notes = p_notes
  WHERE id = p_session_id;
  
  RETURN v_closing_id;
END;
$$;

COMMENT ON FUNCTION public.close_register_session IS 'Close a register session and create closing summary';

-- ============================================================================
-- Stock Management
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_product_stock()
RETURNS trigger 
LANGUAGE plpgsql 
SET search_path = '' 
AS $$
DECLARE
  v_product record;
BEGIN
  -- Get product info
  SELECT * INTO v_product FROM public.products WHERE id = NEW.product_id;
  
  -- Skip if not tracking inventory or unlimited stock
  IF NOT v_product.track_inventory OR v_product.stock_quantity = -1 THEN
    RETURN NEW;
  END IF;
  
  -- Update stock (treats don't reduce stock)
  IF NOT NEW.is_treat THEN
    UPDATE public.products 
    SET stock_quantity = stock_quantity - NEW.quantity
    WHERE id = NEW.product_id
      AND (allow_negative_stock = true OR stock_quantity >= NEW.quantity);
    
    IF NOT FOUND AND NOT v_product.allow_negative_stock THEN
      RAISE EXCEPTION 'Insufficient stock for product: %', v_product.name;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER order_items_update_stock 
  AFTER INSERT ON public.order_items 
  FOR EACH ROW EXECUTE FUNCTION public.update_product_stock();

COMMIT;
