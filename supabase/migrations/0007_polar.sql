-- Rename Stripe columns to Polar columns in subscriptions table

BEGIN;

ALTER TABLE public.subscriptions RENAME COLUMN stripe_customer_id TO polar_customer_id;
ALTER TABLE public.subscriptions RENAME COLUMN stripe_subscription_id TO polar_subscription_id;

-- Rename the index too
DROP INDEX IF EXISTS idx_subscriptions_stripe_customer;
CREATE INDEX idx_subscriptions_polar_customer ON public.subscriptions(polar_customer_id)
  WHERE polar_customer_id IS NOT NULL;

COMMENT ON TABLE public.subscriptions IS 'Polar billing subscriptions per tenant';

COMMIT;
