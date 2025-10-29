-- ClubOS: Transaction Tables (Register Sessions, Orders, Order Items, Closings)
BEGIN;

CREATE TABLE public.register_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  opened_at timestamptz DEFAULT now(),
  opened_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  closed_at timestamptz,
  notes jsonb,
  updated_at timestamptz,
  CHECK (closed_at IS NULL OR closed_at > opened_at)
);

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.register_sessions(id) ON DELETE CASCADE,
  subtotal decimal(10,2) NOT NULL CHECK (subtotal >= 0),
  discount_amount decimal(10,2) DEFAULT 0 CHECK (discount_amount >= 0),
  total_amount decimal(10,2) NOT NULL CHECK (total_amount >= 0),
  coupon_count integer DEFAULT 0 CHECK (coupon_count >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  CHECK (total_amount = subtotal - discount_amount)
);

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price decimal(10,2) NOT NULL CHECK (unit_price >= 0),
  line_total decimal(10,2) NOT NULL CHECK (line_total >= 0),
  is_treat boolean DEFAULT false,
  is_deleted boolean DEFAULT false,
  deleted_at timestamptz,
  deleted_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK ((is_treat = true AND line_total = 0) OR (is_treat = false AND line_total = unit_price * quantity)),
  CHECK ((is_deleted = false AND deleted_at IS NULL AND deleted_by IS NULL) OR (is_deleted = true AND deleted_at IS NOT NULL AND deleted_by IS NOT NULL))
);

CREATE TABLE public.register_closings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.register_sessions(id) ON DELETE CASCADE UNIQUE,
  orders_count integer DEFAULT 0 CHECK (orders_count >= 0),
  orders_total decimal(10,2) DEFAULT 0 CHECK (orders_total >= 0),
  treat_count integer DEFAULT 0 CHECK (treat_count >= 0),
  treat_total decimal(10,2) DEFAULT 0 CHECK (treat_total >= 0),
  total_discounts decimal(10,2) DEFAULT 0 CHECK (total_discounts >= 0),
  notes jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

COMMIT;

