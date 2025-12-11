-- ============================================================================
-- ClubOS Triggers & Functions
-- ============================================================================

BEGIN;

-- ===================
-- UPDATED_AT TRIGGER
-- ===================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply to all tables with updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.facilities
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ===================
-- USER SYNC FROM AUTH
-- ===================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===================
-- STOCK MANAGEMENT
-- ===================

CREATE OR REPLACE FUNCTION public.update_product_stock()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_deleted = false THEN
    UPDATE products 
    SET stock_quantity = stock_quantity - NEW.quantity
    WHERE id = NEW.product_id AND track_inventory = true;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle soft delete (restore stock)
    IF OLD.is_deleted = false AND NEW.is_deleted = true THEN
      UPDATE products 
      SET stock_quantity = stock_quantity + OLD.quantity
      WHERE id = NEW.product_id AND track_inventory = true;
    -- Handle undelete (deduct stock again)
    ELSIF OLD.is_deleted = true AND NEW.is_deleted = false THEN
      UPDATE products 
      SET stock_quantity = stock_quantity - NEW.quantity
      WHERE id = NEW.product_id AND track_inventory = true;
    -- Handle quantity change
    ELSIF OLD.quantity != NEW.quantity AND NEW.is_deleted = false THEN
      UPDATE products 
      SET stock_quantity = stock_quantity + OLD.quantity - NEW.quantity
      WHERE id = NEW.product_id AND track_inventory = true;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_order_item_change
  AFTER INSERT OR UPDATE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.update_product_stock();

-- ===================
-- ORDER TOTAL CALCULATION
-- ===================

CREATE OR REPLACE FUNCTION public.calculate_order_totals()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_subtotal numeric(10,2);
  v_treat_total numeric(10,2);
BEGIN
  -- Calculate subtotal from non-deleted, non-treat items
  SELECT COALESCE(SUM(line_total), 0)
  INTO v_subtotal
  FROM order_items
  WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
    AND is_deleted = false
    AND is_treat = false;

  -- Update order
  UPDATE orders
  SET 
    subtotal = v_subtotal,
    total_amount = v_subtotal - discount_amount + tax_amount
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_order_item_totals
  AFTER INSERT OR UPDATE OR DELETE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.calculate_order_totals();

-- ===================
-- BOOKING VALIDATION
-- ===================

CREATE OR REPLACE FUNCTION public.validate_booking()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- For football bookings, check field_number exists
  IF NEW.type = 'football' AND (NEW.details->>'field_number') IS NULL THEN
    RAISE EXCEPTION 'Football bookings require field_number in details';
  END IF;
  
  -- For birthday bookings, check num_children exists
  IF NEW.type = 'birthday' AND (NEW.details->>'num_children') IS NULL THEN
    RAISE EXCEPTION 'Birthday bookings require num_children in details';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_booking_before_insert
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.validate_booking();

COMMIT;
