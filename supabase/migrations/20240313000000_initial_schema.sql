-- Initial schema for the NextJS POS System application
BEGIN;
-- =============================================================================
-- EXTENSIONS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- =============================================================================
-- TYPES
-- =============================================================================
CREATE TYPE public.payment_method_type AS ENUM ('cash', 'card', 'treat');
-- =============================================================================
-- TABLES
-- =============================================================================

-- Create users table to bridge auth.users with our application
CREATE TABLE public.users (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username text NOT NULL,
    role text NOT NULL DEFAULT 'employee',
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT valid_role CHECK (role IN ('admin', 'employee', 'secretary'))
);
-- Create categories table
CREATE TABLE public.categories (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL,
    description text,
    parent_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    created_by uuid REFERENCES public.users(id) ON DELETE RESTRICT NOT NULL,
    CONSTRAINT valid_parent CHECK (id != parent_id),
    CONSTRAINT unique_category_name UNIQUE (name)
);
-- Create codes (products) table
CREATE TABLE public.products (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL,
    price numeric(10,2) NOT NULL,
    stock integer DEFAULT 0 NOT NULL,
    category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
    image_url text,
    created_at timestamptz DEFAULT now() NOT NULL,
    created_by uuid REFERENCES public.users(id) ON DELETE RESTRICT NOT NULL,
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT valid_price CHECK (price >= 0),
    CONSTRAINT valid_stock CHECK (stock >= -1), -- -1 for unlimited stock
    CONSTRAINT unique_product_name UNIQUE (name)
);
-- Create register sessions table
CREATE TABLE public.register_sessions (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    opened_at timestamptz DEFAULT now() NOT NULL,
    closed_at timestamptz,
    closed_by_name text,
    notes jsonb
);
-- Create orders table
CREATE TABLE public.orders (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    register_session_id uuid REFERENCES public.register_sessions(id) ON DELETE CASCADE NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    final_amount numeric(10,2) NOT NULL,
    card_discount_count integer DEFAULT 0 NOT NULL,
    created_by uuid REFERENCES public.users(id) ON DELETE RESTRICT NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT valid_amounts CHECK (
        total_amount >= 0 AND
        final_amount >= 0 AND
        card_discount_count >= 0
    )
);
-- Create register closings table
CREATE TABLE public.register_closings (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    register_session_id uuid REFERENCES public.register_sessions(id) ON DELETE CASCADE NOT NULL,
    closed_by_name text,
    treats_count integer NOT NULL,
    treats_total numeric(10,2) NOT NULL DEFAULT 0,
    card_count integer NOT NULL,
    notes jsonb,
    created_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT valid_counts CHECK (
        treats_count >= 0 AND
        card_count >= 0 AND
        treats_total >= 0
    ),
    CONSTRAINT one_closing_per_session UNIQUE (register_session_id)
);
-- Create sales table
CREATE TABLE public.sales (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    product_id uuid REFERENCES public.products(id) ON DELETE RESTRICT NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(10,2) NOT NULL,
    is_treat boolean DEFAULT false NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    is_edited boolean DEFAULT false NOT NULL,
    original_quantity integer,
    original_product_name text,
    edited_at timestamptz,
    edited_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT valid_quantity CHECK (quantity > 0),
    CONSTRAINT valid_prices CHECK (
        unit_price >= 0 AND
        total_price >= 0
    ),
    CONSTRAINT valid_total CHECK (
        total_price <= unit_price * quantity
    )
);
-- Create appointments table
CREATE TABLE public.appointments (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    who_booked text NOT NULL,
    date_time timestamptz NOT NULL,
    contact_details text NOT NULL,
    num_children integer NOT NULL,
    num_adults integer NOT NULL DEFAULT 0,
    notes text,
    created_at timestamptz DEFAULT now() NOT NULL,
    user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT valid_numbers CHECK (
        num_children > 0 AND
        num_adults >= 0
    )
);
-- Create football field bookings table
CREATE TABLE public.football_field_bookings (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    who_booked text NOT NULL,
    booking_datetime timestamptz NOT NULL,
    contact_details text NOT NULL,
    field_number integer NOT NULL,
    num_players integer NOT NULL,
    notes text,
    created_at timestamptz DEFAULT now() NOT NULL,
    user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT valid_field_number CHECK (field_number BETWEEN 1 AND 5),
    CONSTRAINT valid_num_players CHECK (num_players BETWEEN 2 AND 12),
    CONSTRAINT unique_field_booking UNIQUE (field_number, booking_datetime)
);
-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_categories_parent ON public.categories(parent_id);
CREATE INDEX idx_categories_created_by ON public.categories(created_by);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_stock ON public.products(stock);
CREATE INDEX idx_products_created_by ON public.products(created_by);
CREATE INDEX idx_products_price ON public.products(price);
CREATE INDEX idx_products_name ON public.products(name text_pattern_ops);
CREATE INDEX idx_register_sessions_dates ON public.register_sessions(opened_at, closed_at);
CREATE INDEX idx_register_sessions_status ON public.register_sessions(closed_at) WHERE closed_at IS NULL;
CREATE INDEX idx_orders_register_session ON public.orders(register_session_id);
CREATE INDEX idx_orders_created_by ON public.orders(created_by);
CREATE INDEX idx_orders_created_at ON public.orders(created_at);
CREATE INDEX idx_sales_order ON public.sales(order_id);
CREATE INDEX idx_sales_product ON public.sales(product_id);
CREATE INDEX idx_sales_created_at ON public.sales(created_at);
CREATE INDEX idx_sales_is_treat ON public.sales(is_treat) WHERE is_treat = true;
CREATE INDEX idx_sales_is_deleted ON public.sales(is_deleted) WHERE is_deleted = true;
CREATE INDEX idx_sales_is_edited ON public.sales(is_edited) WHERE is_edited = true;
CREATE INDEX idx_sales_edited_by ON public.sales(edited_by);
CREATE INDEX idx_sales_edited_at ON public.sales(edited_at);
CREATE INDEX idx_register_closings_session ON public.register_closings(register_session_id);
CREATE INDEX idx_appointments_date_time ON public.appointments(date_time);
CREATE INDEX idx_appointments_user ON public.appointments(user_id);
CREATE INDEX idx_football_bookings_datetime ON public.football_field_bookings(booking_datetime);
CREATE INDEX idx_football_bookings_field ON public.football_field_bookings(field_number);
CREATE INDEX idx_football_bookings_user ON public.football_field_bookings(user_id);
-- =============================================================================
-- RLS (ROW LEVEL SECURITY)
-- =============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.register_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.register_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.football_field_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
-- =============================================================================
-- POLICIES
-- =============================================================================

-- Users policies
CREATE POLICY "users_select_policy" ON public.users
    FOR SELECT TO authenticated
    USING (true);
CREATE POLICY "users_update_policy" ON public.users
    FOR UPDATE TO authenticated
    USING (
        id = (SELECT auth.uid()) OR
        (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
    )
    WITH CHECK (
        (id = (SELECT auth.uid()) AND role = 'employee') OR
        (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
    );
CREATE POLICY "users_insert_policy" ON public.users
    FOR INSERT TO authenticated
    WITH CHECK (
        (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
    );
CREATE POLICY "users_delete_policy" ON public.users
    FOR DELETE TO authenticated
    USING (
        (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
    );
-- Categories policies
CREATE POLICY "Enable read access for all users" ON public.categories
    FOR SELECT TO authenticated
    USING (true);
CREATE POLICY "Enable insert for admin users" ON public.categories
    FOR INSERT TO authenticated
    WITH CHECK (
        (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
    );
CREATE POLICY "Enable update for admin users" ON public.categories
    FOR UPDATE TO authenticated
    USING (
        (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
    )
    WITH CHECK (
        (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
    );
CREATE POLICY "Enable delete for admin users" ON public.categories
    FOR DELETE TO authenticated
    USING (
        (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
    );
-- Products policies
CREATE POLICY "Enable read access for all users" ON public.products
    FOR SELECT TO authenticated
    USING (true);
CREATE POLICY "Enable insert for admin users" ON public.products
    FOR INSERT TO authenticated
    WITH CHECK (
        (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
    );
CREATE POLICY "Enable update for admin users" ON public.products
    FOR UPDATE TO authenticated
    USING (
        (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
    )
    WITH CHECK (
        (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
    );
CREATE POLICY "Enable delete for admin users" ON public.products
    FOR DELETE TO authenticated
    USING (
        (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
    );
-- Register sessions policies
CREATE POLICY "Enable read access for all users" ON public.register_sessions
    FOR SELECT TO authenticated
    USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.register_sessions
    FOR INSERT TO authenticated
    WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON public.register_sessions
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);
-- Sales policies
CREATE POLICY "Enable read access for all users" ON public.sales
    FOR SELECT TO authenticated
    USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.sales
    FOR INSERT TO authenticated
    WITH CHECK (
        (SELECT created_by FROM public.orders WHERE id = order_id) = (SELECT auth.uid())
    );
CREATE POLICY "Enable update for order creator or admin" ON public.sales
    FOR UPDATE TO authenticated
    USING (
        (SELECT created_by FROM public.orders WHERE id = order_id) = (SELECT auth.uid()) OR
        (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
    )
    WITH CHECK (
        (SELECT created_by FROM public.orders WHERE id = order_id) = (SELECT auth.uid()) OR
        (SELECT role FROM public.users WHERE id = (SELECT auth.uid())) = 'admin'
    );
-- Register closings policies
CREATE POLICY "Enable read access for all users" ON public.register_closings
    FOR SELECT TO authenticated
    USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.register_closings
    FOR INSERT TO authenticated
    WITH CHECK (true);
-- Appointments policies
CREATE POLICY "Enable read access for all users" ON public.appointments
    FOR SELECT TO authenticated
    USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.appointments
    FOR INSERT TO authenticated
    WITH CHECK (true);
CREATE POLICY "Enable update for creator or admin users" ON public.appointments
    FOR UPDATE TO authenticated
    USING (
        user_id = (select auth.uid()) OR
        (SELECT role FROM public.users WHERE id = (select auth.uid())) = 'admin'
    )
    WITH CHECK (
        user_id = (select auth.uid()) OR
        (SELECT role FROM public.users WHERE id = (select auth.uid())) = 'admin'
    );
CREATE POLICY "Enable delete for creator or admin users" ON public.appointments
    FOR DELETE TO authenticated
    USING (
        user_id = (select auth.uid()) OR
        (SELECT role FROM public.users WHERE id = (select auth.uid())) = 'admin'
    );
-- Football field bookings policies
CREATE POLICY "Enable read access for all users" ON public.football_field_bookings
    FOR SELECT TO authenticated
    USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.football_field_bookings
    FOR INSERT TO authenticated
    WITH CHECK (true);
CREATE POLICY "Enable update for creator or admin users" ON public.football_field_bookings
    FOR UPDATE TO authenticated
    USING (
        user_id = (select auth.uid()) OR
        (SELECT role FROM public.users WHERE id = (select auth.uid())) = 'admin'
    )
    WITH CHECK (
        user_id = (select auth.uid()) OR
        (SELECT role FROM public.users WHERE id = (select auth.uid())) = 'admin'
    );
CREATE POLICY "Enable delete for creator or admin users" ON public.football_field_bookings
    FOR DELETE TO authenticated
    USING (
        user_id = (select auth.uid()) OR
        (SELECT role FROM public.users WHERE id = (select auth.uid())) = 'admin'
    );
-- Orders policies
CREATE POLICY "Enable read access for all users" ON public.orders
    FOR SELECT TO authenticated
    USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.orders
    FOR INSERT TO authenticated
    WITH CHECK (created_by = (SELECT auth.uid()));
-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Create function to sync auth users to public users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.users (id, username, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'role', 'employee')
    );
    RETURN NEW;
END;
$$;
-- Create trigger for user sync
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
-- Backfill existing users from auth.users to public.users
INSERT INTO public.users (id, username, role)
SELECT id, COALESCE(raw_user_meta_data->>'username', email), COALESCE(raw_user_meta_data->>'role', 'employee')
FROM auth.users
ON CONFLICT (id) DO NOTHING;
-- Create function to check stock availability
CREATE OR REPLACE FUNCTION public.check_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_product_name text;
BEGIN
    -- Skip check for unlimited stock items (-1)
    IF EXISTS (
        SELECT 1 FROM public.products 
        WHERE id = NEW.product_id 
        AND stock != -1
        AND stock < NEW.quantity
    ) THEN
        SELECT name INTO v_product_name FROM public.products WHERE id = NEW.product_id;
        RAISE EXCEPTION 'Insufficient stock for product %', v_product_name;
    END IF;
    RETURN NEW;
END;
$$;
-- Create trigger for stock check
CREATE TRIGGER check_stock_before_insert
    BEFORE INSERT ON public.sales
    FOR EACH ROW
    EXECUTE FUNCTION public.check_stock();
-- Create function to update stock after sale
CREATE OR REPLACE FUNCTION public.update_stock_after_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Skip update for unlimited stock items (-1)
    UPDATE public.products
    SET stock = stock - NEW.quantity
    WHERE id = NEW.product_id
    AND stock != -1;
    
    RETURN NEW;
END;
$$;
-- Create trigger for stock update
CREATE TRIGGER update_stock_after_insert
    AFTER INSERT ON public.sales
    FOR EACH ROW
    EXECUTE FUNCTION public.update_stock_after_sale();
-- Create function to maintain updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;
-- Create triggers for updated_at maintenance
CREATE TRIGGER update_users_modtime
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_modified_column();
CREATE TRIGGER update_products_modtime
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.update_modified_column();
-- Create function to close register with updated logic
CREATE OR REPLACE FUNCTION public.close_register(
    p_register_session_id uuid,
    p_closed_by_name text,
    p_notes jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_closing_id uuid;
    v_treats_count integer;
    v_treats_total numeric(10,2);
    v_card_count integer;
    v_session_exists boolean;
BEGIN
    -- Check if session exists and is not already closed
    SELECT EXISTS (
        SELECT 1 
        FROM public.register_sessions 
        WHERE id = p_register_session_id 
        AND closed_at IS NULL
    ) INTO v_session_exists;
    
    IF NOT v_session_exists THEN
        RAISE EXCEPTION 'Register session not found or already closed';
    END IF;

    -- Calculate totals from orders and sales, excluding deleted sales
    WITH treat_count AS (
        SELECT 
            COUNT(*) as treat_count,
            SUM(s.unit_price * s.quantity) as treats_total
        FROM public.sales s
        JOIN public.orders o ON s.order_id = o.id
        WHERE o.register_session_id = p_register_session_id 
          AND s.is_treat = true
          AND s.is_deleted = false
    ),
    card_count AS (
        SELECT SUM(card_discount_count) as total_discounts
        FROM public.orders
        WHERE register_session_id = p_register_session_id
    )
    SELECT 
        -- Get treat count and total
        COALESCE((SELECT treat_count FROM treat_count), 0),
        COALESCE((SELECT treats_total FROM treat_count), 0),
        -- Sum all card_discount_counts
        COALESCE((SELECT total_discounts FROM card_count), 0)
    INTO 
        v_treats_count,
        v_treats_total,
        v_card_count
    FROM (SELECT 1) AS dummy;

    -- Create closing record
    INSERT INTO public.register_closings (
        register_session_id,
        closed_by_name,
        treats_count,
        treats_total,
        card_count,
        notes
    ) VALUES (
        p_register_session_id,
        p_closed_by_name,
        v_treats_count,
        v_treats_total,
        v_card_count,
        p_notes
    )
    RETURNING id INTO v_closing_id;

    -- Update register session
    UPDATE public.register_sessions
    SET 
        closed_at = now(),
        closed_by_name = p_closed_by_name,
        notes = p_notes
    WHERE id = p_register_session_id;

    RETURN v_closing_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE;
END;
$$;
-- =============================================================================
-- GRANTS
-- =============================================================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_register TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_stock TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_stock_after_sale TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_modified_column TO authenticated;
-- =============================================================================
-- STORAGE
-- =============================================================================

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true);
-- Storage policies for product images bucket
CREATE POLICY "Give users read access to product images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'product-images');
CREATE POLICY "Give admin users full access to product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'product-images' AND
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);
CREATE POLICY "Give admin users update access to product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'product-images' AND
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);
CREATE POLICY "Give admin users delete access to product images"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'product-images' AND
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);
COMMIT;
