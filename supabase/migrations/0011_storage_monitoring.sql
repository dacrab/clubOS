-- ============================================================================
-- ClubOS Database Schema v2.0
-- Migration 11: Storage Configuration and Monitoring
-- ============================================================================

BEGIN;

-- ============================================================================
-- Storage Buckets
-- ============================================================================

-- Product images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images', 
  'product-images', 
  true, 
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- User avatars bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 
  'avatars', 
  true, 
  2097152, -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Tenant logos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos', 
  'logos', 
  true, 
  1048576, -- 1MB
  ARRAY['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- Storage Policies
-- ============================================================================

-- Product images: public read, authenticated write within tenant
CREATE POLICY product_images_read ON storage.objects 
  FOR SELECT TO public 
  USING (bucket_id = 'product-images');

CREATE POLICY product_images_write ON storage.objects 
  FOR ALL TO authenticated
  USING (
    bucket_id = 'product-images' AND 
    EXISTS (
      SELECT 1 FROM public.current_user_tenant_ids() t
      WHERE position('tenant-' || t::text || '/' IN name) = 1
    )
  )
  WITH CHECK (
    bucket_id = 'product-images' AND 
    EXISTS (
      SELECT 1 FROM public.current_user_tenant_ids() t
      WHERE position('tenant-' || t::text || '/' IN name) = 1
    )
  );

-- Avatars: public read, owner write
CREATE POLICY avatars_read ON storage.objects 
  FOR SELECT TO public 
  USING (bucket_id = 'avatars');

CREATE POLICY avatars_write ON storage.objects 
  FOR ALL TO authenticated
  USING (bucket_id = 'avatars' AND position(auth.uid()::text || '/' IN name) = 1)
  WITH CHECK (bucket_id = 'avatars' AND position(auth.uid()::text || '/' IN name) = 1);

-- Logos: public read, admin write within tenant
CREATE POLICY logos_read ON storage.objects 
  FOR SELECT TO public 
  USING (bucket_id = 'logos');

CREATE POLICY logos_write ON storage.objects 
  FOR ALL TO authenticated
  USING (
    bucket_id = 'logos' AND 
    public.is_admin() AND
    EXISTS (
      SELECT 1 FROM public.current_user_tenant_ids() t
      WHERE position('tenant-' || t::text || '/' IN name) = 1
    )
  )
  WITH CHECK (
    bucket_id = 'logos' AND 
    public.is_admin() AND
    EXISTS (
      SELECT 1 FROM public.current_user_tenant_ids() t
      WHERE position('tenant-' || t::text || '/' IN name) = 1
    )
  );

-- ============================================================================
-- Keep-Alive / Health Check Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public."keep-alive" (
  id bigserial PRIMARY KEY,
  name text DEFAULT '',
  random uuid DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public."keep-alive" IS 'Health check table for monitoring';

ALTER TABLE public."keep-alive" ENABLE ROW LEVEL SECURITY;

-- Deny all access by default (only service role can access)
CREATE POLICY "keep_alive_deny_all" ON public."keep-alive" 
  FOR ALL TO public 
  USING (false) 
  WITH CHECK (false);

COMMIT;
