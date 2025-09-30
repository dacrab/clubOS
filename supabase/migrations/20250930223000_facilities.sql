-- Facilities feature (multi-facility per tenant)
BEGIN;

-- Facilities table
CREATE TABLE IF NOT EXISTS public.facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS facilities_unique_name_per_tenant
  ON public.facilities(tenant_id, lower(name));

-- Facility membership
CREATE TABLE IF NOT EXISTS public.facility_members (
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (facility_id, user_id)
);

ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facility_members ENABLE ROW LEVEL SECURITY;

-- Facility policies
CREATE POLICY facilities_read ON public.facilities FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.user_id = (select auth.uid()) AND tm.tenant_id = facilities.tenant_id
  ));

CREATE POLICY facility_members_select ON public.facility_members FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));
CREATE POLICY facility_members_insert ON public.facility_members FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY facility_members_delete ON public.facility_members FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- Add facility_id to domain tables
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS facility_id uuid;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS facility_id uuid;
ALTER TABLE public.register_sessions ADD COLUMN IF NOT EXISTS facility_id uuid;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS facility_id uuid;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS facility_id uuid;
ALTER TABLE public.football_bookings ADD COLUMN IF NOT EXISTS facility_id uuid;

-- Ensure default facility per tenant for backfill
CREATE OR REPLACE FUNCTION public.ensure_default_facility_for_tenant(p_tenant_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_facility_id uuid; BEGIN
  SELECT id INTO v_facility_id FROM public.facilities
  WHERE tenant_id = p_tenant_id AND lower(name) = 'main facility' LIMIT 1;
  IF v_facility_id IS NOT NULL THEN RETURN v_facility_id; END IF;
  INSERT INTO public.facilities (tenant_id, name)
  VALUES (p_tenant_id, 'Main Facility')
  ON CONFLICT (tenant_id, lower(name)) DO UPDATE SET name = facilities.name
  RETURNING id INTO v_facility_id;
  RETURN v_facility_id;
END; $$;

-- Backfill facility_id using existing tenant_id from rows
UPDATE public.categories c
SET facility_id = COALESCE(c.facility_id, public.ensure_default_facility_for_tenant(c.tenant_id))
WHERE c.facility_id IS NULL;

UPDATE public.products p
SET facility_id = COALESCE(p.facility_id, public.ensure_default_facility_for_tenant(p.tenant_id))
WHERE p.facility_id IS NULL;

UPDATE public.register_sessions s
SET facility_id = COALESCE(s.facility_id, public.ensure_default_facility_for_tenant(s.tenant_id))
WHERE s.facility_id IS NULL;

UPDATE public.orders o
SET facility_id = COALESCE(o.facility_id, public.ensure_default_facility_for_tenant(o.tenant_id))
WHERE o.facility_id IS NULL;

UPDATE public.appointments a
SET facility_id = COALESCE(a.facility_id, public.ensure_default_facility_for_tenant(a.tenant_id))
WHERE a.facility_id IS NULL;

UPDATE public.football_bookings f
SET facility_id = COALESCE(f.facility_id, public.ensure_default_facility_for_tenant(f.tenant_id))
WHERE f.facility_id IS NULL;

-- Add FKs and indexes for facility_id
ALTER TABLE public.categories
  ADD CONSTRAINT categories_facility_fk FOREIGN KEY (facility_id) REFERENCES public.facilities(id) ON DELETE CASCADE;
ALTER TABLE public.products
  ADD CONSTRAINT products_facility_fk FOREIGN KEY (facility_id) REFERENCES public.facilities(id) ON DELETE CASCADE;
ALTER TABLE public.register_sessions
  ADD CONSTRAINT register_sessions_facility_fk FOREIGN KEY (facility_id) REFERENCES public.facilities(id) ON DELETE CASCADE;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_facility_fk FOREIGN KEY (facility_id) REFERENCES public.facilities(id) ON DELETE CASCADE;
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_facility_fk FOREIGN KEY (facility_id) REFERENCES public.facilities(id) ON DELETE CASCADE;
ALTER TABLE public.football_bookings
  ADD CONSTRAINT football_bookings_facility_fk FOREIGN KEY (facility_id) REFERENCES public.facilities(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_categories_facility ON public.categories(facility_id);
CREATE INDEX IF NOT EXISTS idx_products_facility ON public.products(facility_id);
CREATE INDEX IF NOT EXISTS idx_sessions_facility ON public.register_sessions(facility_id);
CREATE INDEX IF NOT EXISTS idx_orders_facility ON public.orders(facility_id);
CREATE INDEX IF NOT EXISTS idx_appointments_facility ON public.appointments(facility_id);
CREATE INDEX IF NOT EXISTS idx_football_facility ON public.football_bookings(facility_id);

-- Integrity: facility must match tenant
CREATE OR REPLACE FUNCTION public.assert_facility_tenant_match()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_fac_tenant uuid; BEGIN
  IF NEW.facility_id IS NULL THEN RETURN NEW; END IF;
  SELECT tenant_id INTO v_fac_tenant FROM public.facilities WHERE id = NEW.facility_id;
  IF v_fac_tenant IS NULL OR v_fac_tenant <> NEW.tenant_id THEN
    RAISE EXCEPTION 'facility and tenant mismatch';
  END IF; RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_categories_facility_tenant ON public.categories;
CREATE TRIGGER trg_categories_facility_tenant BEFORE INSERT OR UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.assert_facility_tenant_match();

DROP TRIGGER IF EXISTS trg_products_facility_tenant ON public.products;
CREATE TRIGGER trg_products_facility_tenant BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.assert_facility_tenant_match();

DROP TRIGGER IF EXISTS trg_sessions_facility_tenant ON public.register_sessions;
CREATE TRIGGER trg_sessions_facility_tenant BEFORE INSERT OR UPDATE ON public.register_sessions
  FOR EACH ROW EXECUTE FUNCTION public.assert_facility_tenant_match();

DROP TRIGGER IF EXISTS trg_orders_facility_tenant ON public.orders;
CREATE TRIGGER trg_orders_facility_tenant BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.assert_facility_tenant_match();

DROP TRIGGER IF EXISTS trg_appointments_facility_tenant ON public.appointments;
CREATE TRIGGER trg_appointments_facility_tenant BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.assert_facility_tenant_match();

DROP TRIGGER IF EXISTS trg_football_facility_tenant ON public.football_bookings;
CREATE TRIGGER trg_football_facility_tenant BEFORE INSERT OR UPDATE ON public.football_bookings
  FOR EACH ROW EXECUTE FUNCTION public.assert_facility_tenant_match();

-- Default facility for inserts when missing
CREATE OR REPLACE FUNCTION public.default_facility_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT fm.facility_id FROM public.facility_members fm WHERE fm.user_id = (select auth.uid()) LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.apply_default_facility()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN IF NEW.facility_id IS NULL THEN NEW.facility_id := public.default_facility_id(); END IF; RETURN NEW; END; $$;

CREATE TRIGGER categories_default_facility BEFORE INSERT ON public.categories FOR EACH ROW EXECUTE FUNCTION public.apply_default_facility();
CREATE TRIGGER products_default_facility BEFORE INSERT ON public.products FOR EACH ROW EXECUTE FUNCTION public.apply_default_facility();
CREATE TRIGGER sessions_default_facility BEFORE INSERT ON public.register_sessions FOR EACH ROW EXECUTE FUNCTION public.apply_default_facility();
CREATE TRIGGER orders_default_facility BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.apply_default_facility();
CREATE TRIGGER appointments_default_facility BEFORE INSERT ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.apply_default_facility();
CREATE TRIGGER football_default_facility BEFORE INSERT ON public.football_bookings FOR EACH ROW EXECUTE FUNCTION public.apply_default_facility();

-- Update RLS to include facility membership (admins can access any facility in their tenant)
-- Categories
DROP POLICY IF EXISTS categories_tenant_all ON public.categories;
CREATE POLICY categories_tenant_facility_all ON public.categories FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.user_id = (select auth.uid()) AND tm.tenant_id = categories.tenant_id)
    AND (
      (SELECT role FROM public.users WHERE id = (select auth.uid())) = 'admin'
      OR EXISTS (SELECT 1 FROM public.facility_members fm WHERE fm.user_id = (select auth.uid()) AND fm.facility_id = categories.facility_id)
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.user_id = (select auth.uid()) AND tm.tenant_id = categories.tenant_id)
    AND (
      (SELECT role FROM public.users WHERE id = (select auth.uid())) = 'admin'
      OR EXISTS (SELECT 1 FROM public.facility_members fm WHERE fm.user_id = (select auth.uid()) AND fm.facility_id = categories.facility_id)
    )
  );

-- Products
DROP POLICY IF EXISTS products_tenant_all ON public.products;
CREATE POLICY products_tenant_facility_all ON public.products FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.user_id = (select auth.uid()) AND tm.tenant_id = products.tenant_id)
    AND (
      (SELECT role FROM public.users WHERE id = (select auth.uid())) = 'admin'
      OR EXISTS (SELECT 1 FROM public.facility_members fm WHERE fm.user_id = (select auth.uid()) AND fm.facility_id = products.facility_id)
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.user_id = (select auth.uid()) AND tm.tenant_id = products.tenant_id)
    AND (
      (SELECT role FROM public.users WHERE id = (select auth.uid())) = 'admin'
      OR EXISTS (SELECT 1 FROM public.facility_members fm WHERE fm.user_id = (select auth.uid()) AND fm.facility_id = products.facility_id)
    )
  );

-- Register sessions
DROP POLICY IF EXISTS register_sessions_tenant_all ON public.register_sessions;
CREATE POLICY register_sessions_tenant_facility_all ON public.register_sessions FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.user_id = (select auth.uid()) AND tm.tenant_id = register_sessions.tenant_id)
    AND (
      (SELECT role FROM public.users WHERE id = (select auth.uid())) = 'admin'
      OR EXISTS (SELECT 1 FROM public.facility_members fm WHERE fm.user_id = (select auth.uid()) AND fm.facility_id = register_sessions.facility_id)
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.user_id = (select auth.uid()) AND tm.tenant_id = register_sessions.tenant_id)
    AND (
      (SELECT role FROM public.users WHERE id = (select auth.uid())) = 'admin'
      OR EXISTS (SELECT 1 FROM public.facility_members fm WHERE fm.user_id = (select auth.uid()) AND fm.facility_id = register_sessions.facility_id)
    )
  );

-- Orders
DROP POLICY IF EXISTS orders_tenant_all ON public.orders;
CREATE POLICY orders_tenant_facility_all ON public.orders FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.user_id = (select auth.uid()) AND tm.tenant_id = orders.tenant_id)
    AND (
      (SELECT role FROM public.users WHERE id = (select auth.uid())) = 'admin'
      OR EXISTS (SELECT 1 FROM public.facility_members fm WHERE fm.user_id = (select auth.uid()) AND fm.facility_id = orders.facility_id)
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.user_id = (select auth.uid()) AND tm.tenant_id = orders.tenant_id)
    AND (
      (SELECT role FROM public.users WHERE id = (select auth.uid())) = 'admin'
      OR EXISTS (SELECT 1 FROM public.facility_members fm WHERE fm.user_id = (select auth.uid()) AND fm.facility_id = orders.facility_id)
    )
  );

-- Order items (derive via order)
DROP POLICY IF EXISTS order_items_tenant_all ON public.order_items;
CREATE POLICY order_items_tenant_facility_all ON public.order_items FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    LEFT JOIN public.facility_members fm ON fm.user_id = (select auth.uid()) AND fm.facility_id = o.facility_id
    LEFT JOIN public.users u ON u.id = (select auth.uid())
    WHERE o.id = order_items.order_id
      AND EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.user_id = u.id AND tm.tenant_id = o.tenant_id)
      AND (u.role = 'admin' OR fm.facility_id IS NOT NULL)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.orders o
    LEFT JOIN public.facility_members fm ON fm.user_id = (select auth.uid()) AND fm.facility_id = o.facility_id
    LEFT JOIN public.users u ON u.id = (select auth.uid())
    WHERE o.id = order_items.order_id
      AND EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.user_id = u.id AND tm.tenant_id = o.tenant_id)
      AND (u.role = 'admin' OR fm.facility_id IS NOT NULL)
  ));

-- Register closings (via session)
DROP POLICY IF EXISTS register_closings_tenant_all ON public.register_closings;
CREATE POLICY register_closings_tenant_facility_all ON public.register_closings FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.register_sessions s
    LEFT JOIN public.facility_members fm ON fm.user_id = (select auth.uid()) AND fm.facility_id = s.facility_id
    LEFT JOIN public.users u ON u.id = (select auth.uid())
    WHERE s.id = register_closings.session_id
      AND EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.user_id = u.id AND tm.tenant_id = s.tenant_id)
      AND (u.role = 'admin' OR fm.facility_id IS NOT NULL)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.register_sessions s
    LEFT JOIN public.facility_members fm ON fm.user_id = (select auth.uid()) AND fm.facility_id = s.facility_id
    LEFT JOIN public.users u ON u.id = (select auth.uid())
    WHERE s.id = register_closings.session_id
      AND EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.user_id = u.id AND tm.tenant_id = s.tenant_id)
      AND (u.role = 'admin' OR fm.facility_id IS NOT NULL)
  ));

-- Appointments
DROP POLICY IF EXISTS appointments_tenant_all ON public.appointments;
CREATE POLICY appointments_tenant_facility_all ON public.appointments FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.user_id = (select auth.uid()) AND tm.tenant_id = appointments.tenant_id)
    AND (
      (SELECT role FROM public.users WHERE id = (select auth.uid())) = 'admin'
      OR EXISTS (SELECT 1 FROM public.facility_members fm WHERE fm.user_id = (select auth.uid()) AND fm.facility_id = appointments.facility_id)
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.user_id = (select auth.uid()) AND tm.tenant_id = appointments.tenant_id)
    AND (
      (SELECT role FROM public.users WHERE id = (select auth.uid())) = 'admin'
      OR EXISTS (SELECT 1 FROM public.facility_members fm WHERE fm.user_id = (select auth.uid()) AND fm.facility_id = appointments.facility_id)
    )
  );

-- Football bookings
DROP POLICY IF EXISTS football_bookings_tenant_all ON public.football_bookings;
CREATE POLICY football_bookings_tenant_facility_all ON public.football_bookings FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.user_id = (select auth.uid()) AND tm.tenant_id = football_bookings.tenant_id)
    AND (
      (SELECT role FROM public.users WHERE id = (select auth.uid())) = 'admin'
      OR EXISTS (SELECT 1 FROM public.facility_members fm WHERE fm.user_id = (select auth.uid()) AND fm.facility_id = football_bookings.facility_id)
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.user_id = (select auth.uid()) AND tm.tenant_id = football_bookings.tenant_id)
    AND (
      (SELECT role FROM public.users WHERE id = (select auth.uid())) = 'admin'
      OR EXISTS (SELECT 1 FROM public.facility_members fm WHERE fm.user_id = (select auth.uid()) AND fm.facility_id = football_bookings.facility_id)
    )
  );

COMMIT;


