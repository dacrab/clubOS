-- Tenant settings and user preferences
BEGIN;

-- Tenant settings (optionally per facility)
CREATE TABLE IF NOT EXISTS public.tenant_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  facility_id uuid REFERENCES public.facilities(id) ON DELETE CASCADE,
  low_stock_threshold integer NOT NULL DEFAULT 3 CHECK (low_stock_threshold >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ensure single row per (tenant, facility)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tenant_settings_tenant_facility_uniq'
      AND conrelid = 'public.tenant_settings'::regclass
  ) THEN
    ALTER TABLE public.tenant_settings
      ADD CONSTRAINT tenant_settings_tenant_facility_uniq UNIQUE (tenant_id, facility_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tenant_settings_tenant ON public.tenant_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_settings_facility ON public.tenant_settings(tenant_id, facility_id);

ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;

-- Select for any tenant member
CREATE POLICY tenant_settings_select ON public.tenant_settings FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.user_id = (select auth.uid()) AND tm.tenant_id = tenant_settings.tenant_id
  ));

-- Admin-only writes
CREATE POLICY tenant_settings_write ON public.tenant_settings FOR ALL TO authenticated
  USING ((SELECT role FROM public.users WHERE id = (select auth.uid())) = 'admin'
    AND EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.user_id = (select auth.uid()) AND tm.tenant_id = tenant_settings.tenant_id
    ))
  WITH CHECK ((SELECT role FROM public.users WHERE id = (select auth.uid())) = 'admin'
    AND EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.user_id = (select auth.uid()) AND tm.tenant_id = tenant_settings.tenant_id
    ));

-- Touch trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at_settings()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_tenant_settings_touch ON public.tenant_settings;
CREATE TRIGGER trg_tenant_settings_touch BEFORE UPDATE ON public.tenant_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_settings();

-- User preferences
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  collapsed_sidebar boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_preferences_rw ON public.user_preferences FOR ALL TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP TRIGGER IF EXISTS trg_user_preferences_touch ON public.user_preferences;
CREATE TRIGGER trg_user_preferences_touch BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_settings();

COMMIT;


