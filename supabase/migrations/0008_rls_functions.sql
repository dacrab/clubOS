-- ============================================================================
-- ClubOS Database Schema v2.0
-- Migration 8: RLS Helper Functions
-- ============================================================================

BEGIN;

-- Get current user's role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role 
LANGUAGE sql STABLE SECURITY DEFINER 
SET search_path = '' 
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.users WHERE id = auth.uid()),
    'staff'::public.user_role
  )
$$;

COMMENT ON FUNCTION public.current_user_role IS 'Returns the current authenticated user role';

-- Check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean 
LANGUAGE sql STABLE SECURITY DEFINER 
SET search_path = '' 
AS $$
  SELECT public.current_user_role() = 'admin'
$$;

COMMENT ON FUNCTION public.is_admin IS 'Returns true if current user is an admin';

-- Check if current user is admin or secretary
CREATE OR REPLACE FUNCTION public.is_admin_or_secretary()
RETURNS boolean 
LANGUAGE sql STABLE SECURITY DEFINER 
SET search_path = '' 
AS $$
  SELECT public.current_user_role() IN ('admin', 'secretary')
$$;

COMMENT ON FUNCTION public.is_admin_or_secretary IS 'Returns true if current user is admin or secretary';

-- Check if user has access to a tenant
CREATE OR REPLACE FUNCTION public.has_tenant_access(p_tenant_id uuid)
RETURNS boolean 
LANGUAGE sql STABLE SECURITY DEFINER 
SET search_path = '' 
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members 
    WHERE user_id = auth.uid() AND tenant_id = p_tenant_id
  )
$$;

COMMENT ON FUNCTION public.has_tenant_access IS 'Check if current user belongs to specified tenant';

-- Check if user has access to a facility
CREATE OR REPLACE FUNCTION public.has_facility_access(p_facility_id uuid)
RETURNS boolean 
LANGUAGE sql STABLE SECURITY DEFINER 
SET search_path = '' 
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.facility_members 
    WHERE user_id = auth.uid() AND facility_id = p_facility_id
  )
$$;

COMMENT ON FUNCTION public.has_facility_access IS 'Check if current user has access to specified facility';

-- Check if facility belongs to user's tenant
CREATE OR REPLACE FUNCTION public.has_facility_in_user_tenants(p_facility_id uuid)
RETURNS boolean 
LANGUAGE sql STABLE SECURITY DEFINER 
SET search_path = '' 
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.facilities f
    JOIN public.tenant_members tm ON tm.tenant_id = f.tenant_id
    WHERE f.id = p_facility_id AND tm.user_id = auth.uid()
  )
$$;

COMMENT ON FUNCTION public.has_facility_in_user_tenants IS 'Check if facility belongs to any of user tenants';

-- Check combined tenant and facility access
CREATE OR REPLACE FUNCTION public.has_tenant_facility_access(p_tenant_id uuid, p_facility_id uuid)
RETURNS boolean 
LANGUAGE sql STABLE SECURITY DEFINER 
SET search_path = '' 
AS $$
  SELECT public.has_tenant_access(p_tenant_id) AND (
    public.current_user_role() = 'admin' OR public.has_facility_access(p_facility_id)
  )
$$;

COMMENT ON FUNCTION public.has_tenant_facility_access IS 'Check if user has access to tenant and facility (admin bypasses facility check)';

-- Check if users share a tenant
CREATE OR REPLACE FUNCTION public.has_shared_tenant(target_user_id uuid)
RETURNS boolean 
LANGUAGE sql STABLE SECURITY DEFINER 
SET search_path = '' 
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members s
    JOIN public.tenant_members o ON s.tenant_id = o.tenant_id
    WHERE s.user_id = auth.uid() AND o.user_id = target_user_id
  )
$$;

COMMENT ON FUNCTION public.has_shared_tenant IS 'Check if current user shares a tenant with target user';

-- Get user's tenant IDs
CREATE OR REPLACE FUNCTION public.current_user_tenant_ids()
RETURNS SETOF uuid 
LANGUAGE sql STABLE SECURITY DEFINER 
SET search_path = '' 
AS $$
  SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
$$;

COMMENT ON FUNCTION public.current_user_tenant_ids IS 'Returns all tenant IDs the current user belongs to';

-- Get user's facility IDs
CREATE OR REPLACE FUNCTION public.current_user_facility_ids()
RETURNS SETOF uuid 
LANGUAGE sql STABLE SECURITY DEFINER 
SET search_path = '' 
AS $$
  SELECT facility_id FROM public.facility_members WHERE user_id = auth.uid()
$$;

COMMENT ON FUNCTION public.current_user_facility_ids IS 'Returns all facility IDs the current user has access to';

COMMIT;
