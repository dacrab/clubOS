-- ClubOS: RLS Helper Functions
BEGIN;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT COALESCE(
    (SELECT role FROM public.users WHERE id = (select auth.uid())),
    NULLIF(auth.jwt() ->> 'role', '')::public.user_role,
    'staff'::public.user_role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.current_user_role() = 'admin'
$$;

CREATE OR REPLACE FUNCTION public.has_shared_tenant(target_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_members s
    JOIN public.tenant_members o ON s.tenant_id = o.tenant_id
    WHERE s.user_id = (select auth.uid()) AND o.user_id = target_user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.has_facility_in_user_tenants(p_facility_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.facilities f
    JOIN public.tenant_members tm ON tm.tenant_id = f.tenant_id AND tm.user_id = (select auth.uid())
    WHERE f.id = p_facility_id
  )
$$;

CREATE OR REPLACE FUNCTION public.has_tenant_access(p_tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.user_id = (select auth.uid()) AND tm.tenant_id = p_tenant_id
  )
$$;

CREATE OR REPLACE FUNCTION public.has_facility_access(p_facility_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.facility_members fm 
    WHERE fm.user_id = (select auth.uid()) AND fm.facility_id = p_facility_id
  )
$$;

CREATE OR REPLACE FUNCTION public.has_tenant_facility_access(p_tenant_id uuid, p_facility_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.has_tenant_access(p_tenant_id) AND (
    public.current_user_role() = 'admin' OR public.has_facility_access(p_facility_id)
  )
$$;

COMMIT;

