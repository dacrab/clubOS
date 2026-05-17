import { getSupabaseAdmin } from "$lib/server/supabase-admin";

export interface StripeSubscription {
	id: string;
	status: string;
	metadata?: { tenant_id?: string };
	items?: { data?: { price?: { id?: string; nickname?: string } }[] };
	current_period_start: number;
	current_period_end: number;
	cancel_at_period_end?: boolean;
	trial_start?: number | null;
	trial_end?: number | null;
}

export const ts = (s: number | null | undefined): string | null =>
	s ? new Date(s * 1000).toISOString() : null;

export async function stripeGet<T = unknown>(path: string, key: string): Promise<T> {
	const res = await fetch(`https://api.stripe.com/v1${path}`, {
		headers: { Authorization: `Bearer ${key}` },
	});
	const data = await res.json();
	if (!res.ok) throw new Error(data.error?.message || `Stripe error on ${path}`);
	return data as T;
}

export async function upsertSubscription(args: {
	tenantId: string;
	customerId: string | null;
	sub: StripeSubscription;
}): Promise<void> {
	const { tenantId, customerId, sub } = args;
	const price = sub.items?.data?.[0]?.price;
	const { error } = await getSupabaseAdmin().from("subscriptions").upsert({
		tenant_id: tenantId,
		stripe_customer_id: customerId,
		stripe_subscription_id: sub.id,
		stripe_price_id: price?.id ?? null,
		status: sub.status,
		plan_name: price?.nickname ?? "Subscription",
		current_period_start: ts(sub.current_period_start),
		current_period_end: ts(sub.current_period_end),
		cancel_at_period_end: sub.cancel_at_period_end ?? false,
		trial_start: ts(sub.trial_start),
		trial_end: ts(sub.trial_end),
	}, { onConflict: "tenant_id" });
	if (error) throw new Error(error.message);
}
