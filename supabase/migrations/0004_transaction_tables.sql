-- ============================================================================
-- ClubOS Database Schema v2.0
-- Migration 4: Transaction Tables (Register Sessions, Orders, Order Items)
-- ============================================================================

BEGIN;

-- Register sessions (cash register open/close cycles)
CREATE TABLE public.register_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  opened_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  closed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  opening_cash numeric(10,2) NOT NULL DEFAULT 0,
  closing_cash numeric(10,2),
  expected_cash numeric(10,2),
  cash_difference numeric(10,2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sessions_close_after_open CHECK (closed_at IS NULL OR closed_at > opened_at),
  CONSTRAINT sessions_cash_positive CHECK (opening_cash >= 0)
);

COMMENT ON TABLE public.register_sessions IS 'Tracks cash register open/close cycles';
COMMENT ON COLUMN public.register_sessions.cash_difference IS 'Difference between expected and actual closing cash';

-- Orders (sales transactions)
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.register_sessions(id) ON DELETE SET NULL,
  order_number serial,
  status public.order_status NOT NULL DEFAULT 'completed',
  payment_method public.payment_method NOT NULL DEFAULT 'cash',
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  tax_amount numeric(10,2) NOT NULL DEFAULT 0,
  discount_amount numeric(10,2) NOT NULL DEFAULT 0,
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  coupon_count integer NOT NULL DEFAULT 0,
  cash_received numeric(10,2),
  change_given numeric(10,2),
  customer_name text,
  customer_phone text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  CONSTRAINT orders_amounts_positive CHECK (
    subtotal >= 0 AND 
    tax_amount >= 0 AND 
    discount_amount >= 0 AND 
    total_amount >= 0
  ),
  CONSTRAINT orders_coupon_count_positive CHECK (coupon_count >= 0)
);

COMMENT ON TABLE public.orders IS 'Sales transactions';
COMMENT ON COLUMN public.orders.order_number IS 'Human-readable sequential order number';

-- Order items (line items within an order)
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL,
  discount_amount numeric(10,2) NOT NULL DEFAULT 0,
  line_total numeric(10,2) NOT NULL,
  is_treat boolean NOT NULL DEFAULT false,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  deleted_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT order_items_quantity_positive CHECK (quantity > 0),
  CONSTRAINT order_items_price_positive CHECK (unit_price >= 0),
  CONSTRAINT order_items_total_valid CHECK (
    (is_treat = true AND line_total = 0) OR 
    (is_treat = false AND line_total = (unit_price * quantity) - discount_amount)
  ),
  CONSTRAINT order_items_deleted_valid CHECK (
    (is_deleted = false AND deleted_at IS NULL AND deleted_by IS NULL) OR
    (is_deleted = true AND deleted_at IS NOT NULL)
  )
);

COMMENT ON TABLE public.order_items IS 'Individual items within an order';
COMMENT ON COLUMN public.order_items.product_name IS 'Denormalized for historical accuracy';
COMMENT ON COLUMN public.order_items.is_treat IS 'Item given for free (promotional)';

-- Register closings (summary when closing a register)
CREATE TABLE public.register_closings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.register_sessions(id) ON DELETE CASCADE,
  orders_count integer NOT NULL DEFAULT 0,
  orders_total numeric(10,2) NOT NULL DEFAULT 0,
  cash_total numeric(10,2) NOT NULL DEFAULT 0,
  card_total numeric(10,2) NOT NULL DEFAULT 0,
  coupon_total numeric(10,2) NOT NULL DEFAULT 0,
  treat_count integer NOT NULL DEFAULT 0,
  treat_value numeric(10,2) NOT NULL DEFAULT 0,
  discount_total numeric(10,2) NOT NULL DEFAULT 0,
  refund_count integer NOT NULL DEFAULT 0,
  refund_total numeric(10,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT register_closings_session_unique UNIQUE (session_id),
  CONSTRAINT register_closings_counts_positive CHECK (
    orders_count >= 0 AND 
    treat_count >= 0 AND 
    refund_count >= 0
  )
);

COMMENT ON TABLE public.register_closings IS 'Financial summary when closing a register session';

COMMIT;
