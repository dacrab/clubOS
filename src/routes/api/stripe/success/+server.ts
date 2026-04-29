import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { env } from "$env/dynamic/private";
import { getSupabaseAdmin } from "$lib/server/supabase-admin";

const ts = (s: number): string => new Date(s * 1000).toISOString();

export const GET: RequestHandler = async ({ url, locals }) => {
	const sessionId = url.searchParams.get("session_id");
	if (!sessionId) throw redirect(307, "/billing");

	const STRIPE_SECRET_KEY = env.STRIPE_SECRET_KEY;
	if (!STRIPE_SECRET_KEY) throw redirect(307, "/billing?error=stripe_not_configured");

	try {
		const sessionRes = await fetch(
			`https://api.stripe.com/v1/checkout/sessions/${sessionId}?expand[]=subscription`,
			{ headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` } }
		);
		const session = await sessionRes.json();
		if (!sessionRes.ok) throw new Error(session.error?.message || "Failed to retrieve session");

		const { subscription } = session;
		const tenantId = subscription?.metadata?.tenant_id;
		if (!tenantId || !locals.user) throw redirect(307, "/billing?error=missing_tenant");

		const { error } = await getSupabaseAdmin().from("subscriptions").upsert({
			tenant_id: tenantId,
			stripe_customer_id: session.customer,
			stripe_subscription_id: subscription.id,
			stripe_price_id: subscription.items?.data?.[0]?.price?.id ?? null,
			status: subscription.status,
			plan_name: subscription.items?.data?.[0]?.price?.nickname ?? subscription.items?.data?.[0]?.plan?.nickname ?? "Subscription",
			current_period_start: ts(subscription.current_period_start),
			current_period_end: ts(subscription.current_period_end),
			cancel_at_period_end: subscription.cancel_at_period_end,
			trial_start: subscription.trial_start ? ts(subscription.trial_start) : null,
			trial_end: subscription.trial_end ? ts(subscription.trial_end) : null,
		}, { onConflict: "tenant_id" });

		if (error) throw new Error(error.message);
		throw redirect(307, "/admin?welcome=true");
	} catch (err) {
		if (err && typeof err === "object" && "status" in err) throw err;
		throw redirect(307, "/billing?error=payment_failed");
	}
};
