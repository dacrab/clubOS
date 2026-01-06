-- ============================================================================
-- ClubOS RLS Policies - STUB (see 0005_linter_fixes.sql for actual policies)
-- ============================================================================
-- This migration originally defined RLS policies but they were consolidated
-- and optimized in 0005_linter_fixes.sql. Keeping this file for migration
-- history compatibility.

BEGIN;

-- Enable RLS on all tables (policies defined in 0005)
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.register_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

COMMIT;
