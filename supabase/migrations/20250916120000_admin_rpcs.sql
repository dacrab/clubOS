-- Admin RPCs to support privileged DB actions without service role in app
-- These functions are SECURITY DEFINER and self-guarded by checking the invoker is an admin
-- Note: Auth user lifecycle (create/delete/reset password) still requires Admin API (Edge Functions)

BEGIN;

SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.admin_set_role(p_user_id uuid, p_role public.user_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_invoker_role public.user_role;
BEGIN
  SELECT role INTO v_invoker_role FROM public.users WHERE id = (SELECT auth.uid());
  IF v_invoker_role IS DISTINCT FROM 'admin'::public.user_role THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  UPDATE public.users
  SET role = p_role,
      updated_at = now()
  WHERE id = p_user_id;
END;
$$;

COMMENT ON FUNCTION public.admin_set_role(uuid, public.user_role) IS 'Sets the role of a user; invoker must be admin';

CREATE OR REPLACE FUNCTION public.admin_soft_delete_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_invoker_role public.user_role;
BEGIN
  SELECT role INTO v_invoker_role FROM public.users WHERE id = (SELECT auth.uid());
  IF v_invoker_role IS DISTINCT FROM 'admin'::public.user_role THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  UPDATE public.users
  SET is_active = false,
      updated_at = now()
  WHERE id = p_user_id;
END;
$$;

COMMENT ON FUNCTION public.admin_soft_delete_user(uuid) IS 'Marks a user inactive; invoker must be admin';

-- Permissions: allow authenticated to execute (function self-guards for admin)
GRANT EXECUTE ON FUNCTION public.admin_set_role(uuid, public.user_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_soft_delete_user(uuid) TO authenticated;

COMMIT;


