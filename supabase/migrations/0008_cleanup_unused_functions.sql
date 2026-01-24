-- Cleanup: Remove unused functions from database
-- These functions were created but never used in the application

BEGIN;

-- Drop unused analytics/helper functions
DROP FUNCTION IF EXISTS public.get_category_tree(uuid);
DROP FUNCTION IF EXISTS public.get_category_descendants(uuid);
DROP FUNCTION IF EXISTS public.get_product_performance(uuid, integer);
DROP FUNCTION IF EXISTS public.get_sales_trends(uuid, integer);
DROP FUNCTION IF EXISTS public.refresh_best_sellers();

COMMIT;
