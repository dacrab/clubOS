-- ClubOS: Storage Configuration and Monitoring
BEGIN;

-- Storage configuration
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('product-images', 'product-images', true, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY product_images_read ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'product-images');

CREATE OR REPLACE FUNCTION public.current_tenant_ids_for_user(p_user_id uuid)
RETURNS TABLE(tenant_id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT tm.tenant_id FROM public.tenant_members tm WHERE tm.user_id = p_user_id
$$;

CREATE POLICY product_images_write ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'product-images' AND EXISTS (
      SELECT 1 FROM public.current_tenant_ids_for_user((select auth.uid())) t
      WHERE position('tenant-' || t.tenant_id::text || '/' IN name) = 1
    )
  );

-- Monitoring / keep-alive
CREATE TABLE IF NOT EXISTS public."keep-alive" (
  id bigserial PRIMARY KEY,
  name text DEFAULT ''::text,
  random uuid DEFAULT gen_random_uuid()
);

ALTER TABLE public."keep-alive" ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'keep-alive' AND policyname = 'deny all by default'
  ) THEN
    EXECUTE 'CREATE POLICY "deny all by default" ON public."keep-alive" FOR ALL TO public USING (false) WITH CHECK (false)';
  END IF;
END $$;

COMMIT;

