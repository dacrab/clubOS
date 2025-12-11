-- ============================================================================
-- ClubOS Permissions & Grants
-- ============================================================================

BEGIN;

-- ===================
-- SCHEMA PERMISSIONS
-- ===================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- ===================
-- TABLE PERMISSIONS
-- ===================

-- Authenticated users
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.memberships TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT INSERT, UPDATE ON public.register_sessions TO authenticated;
GRANT INSERT, UPDATE ON public.orders TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.bookings TO authenticated;

-- Service role (full access for webhooks, onboarding, etc.)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ===================
-- SEQUENCE PERMISSIONS
-- ===================

GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ===================
-- FUNCTION PERMISSIONS
-- ===================

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

COMMIT;
