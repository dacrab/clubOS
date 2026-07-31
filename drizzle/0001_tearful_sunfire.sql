-- Indexes for foreign key columns and query performance

-- Facilities: tenant_id lookups
CREATE INDEX IF NOT EXISTS idx_facilities_tenant_id ON facilities (tenant_id);

-- Memberships: user_id, tenant_id, facility_id lookups
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON memberships (user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_tenant_id ON memberships (tenant_id);
CREATE INDEX IF NOT EXISTS idx_memberships_facility_id ON memberships (facility_id);

-- Subscriptions: tenant_id (already has unique index)
-- Already covered by unique constraint on tenant_id

-- Categories: facility_id, parent_id
CREATE INDEX IF NOT EXISTS idx_categories_facility_id ON categories (facility_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories (parent_id);

-- Products: facility_id, category_id, created_by
CREATE INDEX IF NOT EXISTS idx_products_facility_id ON products (facility_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_created_by ON products (created_by);
CREATE INDEX IF NOT EXISTS idx_products_name ON products (name);

-- Register sessions: facility_id, opened_by, closed_by
CREATE INDEX IF NOT EXISTS idx_register_sessions_facility_id ON register_sessions (facility_id);
CREATE INDEX IF NOT EXISTS idx_register_sessions_opened_by ON register_sessions (opened_by);
CREATE INDEX IF NOT EXISTS idx_register_sessions_closed_by ON register_sessions (closed_by);

-- Orders: facility_id, session_id, created_by
CREATE INDEX IF NOT EXISTS idx_orders_facility_id ON orders (facility_id);
CREATE INDEX IF NOT EXISTS idx_orders_session_id ON orders (session_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders (created_by);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);

-- Order items: order_id, facility_id, product_id
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_facility_id ON order_items (facility_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items (product_id);

-- Bookings: facility_id, created_by
CREATE INDEX IF NOT EXISTS idx_bookings_facility_id ON bookings (facility_id);
CREATE INDEX IF NOT EXISTS idx_bookings_created_by ON bookings (created_by);
CREATE INDEX IF NOT EXISTS idx_bookings_starts_at ON bookings (starts_at);
CREATE INDEX IF NOT EXISTS idx_bookings_type ON bookings (type);

-- Audit log: tenant_id, changed_by, table_name
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_id ON audit_log (tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_by ON audit_log (changed_by);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON audit_log (table_name);

-- Updated-at triggers for tables that have updated_at column

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN
        SELECT unnest(ARRAY['tenants', 'users', 'memberships', 'subscriptions', 'facilities', 'categories', 'products', 'orders', 'bookings'])
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_trigger
            WHERE tgname = 'update_' || tbl || '_updated_at'
            AND tgrelid = tbl::regclass
        ) THEN
            EXECUTE format(
                'CREATE TRIGGER update_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
                tbl, tbl
            );
        END IF;
    END LOOP;
END;
$$;
