-- Enable RLS on keep-alive table
ALTER TABLE public."keep-alive" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON public."keep-alive" FOR ALL USING ((SELECT auth.role()) = 'service_role');
