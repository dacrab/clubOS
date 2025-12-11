import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { env } from "$env/dynamic/private";
import { getSupabaseAdmin } from "$lib/server/supabase-admin";

export const GET: RequestHandler = async ({ url, locals }) => {
	const sessionId = url.searchParams.get("session_id");

	if (!sessionId) {
		throw redirect(307, "/billing");
	}

	const STRIPE_SECRET_KEY = env.STRIPE_SECRET_KEY;
	if (!STRIPE_SECRET_KEY) {
		throw redirect(307, "/billing?error=stripe_not_configured");
	}

	try {
		// Retrieve the checkout session from Stripe
		const sessionRes = await fetch(
			`https://api.stripe.com/v1/checkout/sessions/${sessionId}?expand[]=subscription`,
			{
				headers: {
					Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
				},
			}
		);

		const session = await sessionRes.json();
		if (!sessionRes.ok) {
			throw new Error(session.error?.message || "Failed to retrieve session");
		}

		const subscription = session.subscription;
		const customerId = session.customer;
		const tenantId = subscription?.metadata?.tenant_id;

		if (!tenantId || !locals.user) {
			throw redirect(307, "/billing?error=missing_tenant");
		}

		// Update subscription in database (using admin client due to RLS)
		const supabaseAdmin = getSupabaseAdmin();
		const { error } = await supabaseAdmin
			.from("subscriptions")
			.upsert({
				tenant_id: tenantId,
				stripe_customer_id: customerId,
				stripe_subscription_id: subscription.id,
				stripe_price_id: subscription.items?.data?.[0]?.price?.id || null,
				status: subscription.status,
				plan_name: subscription.items?.data?.[0]?.price?.nickname || "Pro",
				current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
				current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
				cancel_at_period_end: subscription.cancel_at_period_end || false,
				trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
				trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
			}, {
				onConflict: "tenant_id",
			});

		if (error) {
			throw new Error(error.message);
		}

		throw redirect(307, "/admin?welcome=true");
	} catch (err) {
		if (err && typeof err === "object" && "status" in err) {
			throw err; // Re-throw redirects
		}
		throw redirect(307, "/billing?error=payment_failed");
	}
};
