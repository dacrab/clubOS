-- ClubOS: Functions and Triggers
BEGIN;

-- Auth integration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE 
  v_username text;
  v_role public.user_role := 'staff';
BEGIN
  v_username := COALESCE(NEW.raw_user_meta_data->>'username', NEW.email, 'user_' || NEW.id::text);
  IF (NEW.raw_user_meta_data->>'role') IN ('admin','staff','secretary') THEN
    v_role := (NEW.raw_user_meta_data->>'role')::public.user_role;
  END IF;
  INSERT INTO public.users (id, username, role) VALUES (NEW.id, v_username, v_role) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Timestamp updates
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN 
  NEW.updated_at = now(); 
  RETURN NEW; 
END; $$;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER facilities_updated_at BEFORE UPDATE ON public.facilities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER register_sessions_updated_at BEFORE UPDATE ON public.register_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER order_items_updated_at BEFORE UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER register_closings_updated_at BEFORE UPDATE ON public.register_closings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER football_bookings_updated_at BEFORE UPDATE ON public.football_bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER tenant_settings_updated_at BEFORE UPDATE ON public.tenant_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER user_preferences_updated_at BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Data integrity functions
CREATE OR REPLACE FUNCTION public.assert_same_tenant_category_parent()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_parent_tenant uuid;
BEGIN
  IF NEW.parent_id IS NULL THEN RETURN NEW; END IF;
  SELECT tenant_id INTO v_parent_tenant FROM public.categories WHERE id = NEW.parent_id;
  IF v_parent_tenant IS NULL OR v_parent_tenant <> NEW.tenant_id THEN
    RAISE EXCEPTION 'Parent category must belong to the same tenant';
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.assert_same_tenant_product_category()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_cat_tenant uuid;
BEGIN
  IF NEW.category_id IS NULL THEN RETURN NEW; END IF;
  SELECT tenant_id INTO v_cat_tenant FROM public.categories WHERE id = NEW.category_id;
  IF v_cat_tenant IS NULL OR v_cat_tenant <> NEW.tenant_id THEN
    RAISE EXCEPTION 'Product category must belong to the same tenant';
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.assert_facility_tenant_match()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_fac_tenant uuid;
BEGIN
  IF NEW.facility_id IS NULL THEN RETURN NEW; END IF;
  SELECT tenant_id INTO v_fac_tenant FROM public.facilities WHERE id = NEW.facility_id;
  IF v_fac_tenant IS NULL OR v_fac_tenant <> NEW.tenant_id THEN
    RAISE EXCEPTION 'Facility and tenant mismatch';
  END IF;
  RETURN NEW;
END; $$;

-- Integrity triggers
CREATE TRIGGER categories_parent_tenant_check BEFORE INSERT OR UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.assert_same_tenant_category_parent();
CREATE TRIGGER products_category_tenant_check BEFORE INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.assert_same_tenant_product_category();
CREATE TRIGGER categories_facility_tenant_check BEFORE INSERT OR UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.assert_facility_tenant_match();
CREATE TRIGGER products_facility_tenant_check BEFORE INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.assert_facility_tenant_match();
CREATE TRIGGER sessions_facility_tenant_check BEFORE INSERT OR UPDATE ON public.register_sessions FOR EACH ROW EXECUTE FUNCTION public.assert_facility_tenant_match();
CREATE TRIGGER orders_facility_tenant_check BEFORE INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.assert_facility_tenant_match();
CREATE TRIGGER appointments_facility_tenant_check BEFORE INSERT OR UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.assert_facility_tenant_match();
CREATE TRIGGER football_facility_tenant_check BEFORE INSERT OR UPDATE ON public.football_bookings FOR EACH ROW EXECUTE FUNCTION public.assert_facility_tenant_match();

-- Register session management
CREATE OR REPLACE FUNCTION public.close_register_session(p_session_id uuid, p_notes jsonb DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE 
  v_closing_id uuid;
  session_stats record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.register_sessions WHERE id = p_session_id AND closed_at IS NULL) THEN
    RAISE EXCEPTION 'Register session not found or already closed';
  END IF;
  
  SELECT 
    COUNT(*) AS orders_count,
    COALESCE(SUM(o.total_amount), 0) AS orders_total,
    COALESCE(SUM((SELECT COUNT(*) FROM public.order_items oi WHERE oi.order_id = o.id AND oi.is_treat = true AND oi.is_deleted = false)), 0) AS treat_count,
    COALESCE(SUM((SELECT SUM(oi.unit_price * oi.quantity) FROM public.order_items oi WHERE oi.order_id = o.id AND oi.is_treat = true AND oi.is_deleted = false)), 0) AS treat_total,
    COALESCE(SUM(o.discount_amount), 0) AS total_discounts
  INTO session_stats 
  FROM public.orders o 
  WHERE o.session_id = p_session_id;

  INSERT INTO public.register_closings (session_id, orders_count, orders_total, treat_count, treat_total, total_discounts, notes)
  VALUES (p_session_id, session_stats.orders_count, session_stats.orders_total, session_stats.treat_count, session_stats.treat_total, session_stats.total_discounts, p_notes)
  RETURNING id INTO v_closing_id;

  UPDATE public.register_sessions SET closed_at = now(), notes = p_notes WHERE id = p_session_id;
  RETURN v_closing_id;
END; $$;

COMMIT;

