-- Row Level Security & Permissions

BEGIN;

-- ============================================================
-- Enable RLS on all tables
-- ============================================================
ALTER TABLE public.tenants          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facilities       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.register_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keep_alive       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log        ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Schema usage
-- ============================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- ============================================================
-- Table-level grants
-- authenticated users get SELECT on all tables;
-- write access is scoped per-table and further restricted by RLS policies.
-- ============================================================
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

GRANT INSERT, UPDATE, DELETE ON
  public.users,
  public.memberships,
  public.categories,
  public.products,
  public.order_items,
  public.bookings
TO authenticated;

GRANT INSERT, UPDATE ON
  public.register_sessions,
  public.orders
TO authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

COMMIT;
