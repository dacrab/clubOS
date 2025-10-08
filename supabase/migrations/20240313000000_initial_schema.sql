-- Legacy single-tenant migration replaced by consolidated multi-tenant baseline.
-- NOTE: Intentionally left as a no-op to avoid conflicts with newer migrations.
-- If this migration was previously applied in an environment, prefer a fresh reset
-- or a dedicated forward-only migration path.
BEGIN;
COMMIT;
