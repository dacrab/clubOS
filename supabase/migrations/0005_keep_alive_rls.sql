-- Enable RLS on keep-alive table (policy may already exist)
ALTER TABLE public."keep-alive" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_only" ON public."keep-alive";
CREATE POLICY "service_role_only" ON public."keep-alive" FOR ALL USING ((SELECT auth.role()) = 'service_role');
