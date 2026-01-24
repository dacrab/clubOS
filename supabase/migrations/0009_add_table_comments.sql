-- Add documentation comments to tables for better schema readability

COMMENT ON TABLE public.tenants IS 'Organizations/companies using the platform (multi-tenant root)';
COMMENT ON TABLE public.subscriptions IS 'Stripe billing subscriptions per tenant';
COMMENT ON TABLE public.facilities IS 'Physical locations belonging to a tenant (clubs, venues)';
COMMENT ON TABLE public.users IS 'User profiles synced from auth.users';
COMMENT ON TABLE public.memberships IS 'User-to-tenant/facility assignments with roles';
COMMENT ON TABLE public.categories IS 'Product categories per facility (hierarchical)';
COMMENT ON TABLE public.products IS 'Inventory items for sale at POS';
COMMENT ON TABLE public.register_sessions IS 'Cash register shift sessions';
COMMENT ON TABLE public.orders IS 'POS sales transactions';
COMMENT ON TABLE public.order_items IS 'Line items within an order';
COMMENT ON TABLE public.bookings IS 'Reservations (birthdays, football fields, events)';
COMMENT ON TABLE public.audit_log IS 'Change history for orders, bookings, products';
COMMENT ON TABLE public.keep_alive IS 'Heartbeat table for cron health checks';
