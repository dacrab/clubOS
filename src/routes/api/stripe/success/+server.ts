import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { env } from "$env/dynamic/private";
import { stripeGet, upsertSubscription, type StripeSubscription } from "$lib/server/stripe";

interface CheckoutSession {
	customer: string;
	subscription: StripeSubscription;
}

export const GET: RequestHandler = async ({ url, locals }) => {
	const sessionId = url.searchParams.get("session_id");
	if (!sessionId) throw redirect(307, "/billing");

	const key = env.STRIPE_SECRET_KEY;
	if (!key) throw redirect(307, "/billing?error=stripe_not_configured");

	try {
		const session = await stripeGet<CheckoutSession>(
			`/checkout/sessions/${sessionId}?expand[]=subscription`,
			key,
		);
		const tenantId = session.subscription?.metadata?.tenant_id;
		if (!tenantId || !locals.user) throw redirect(307, "/billing?error=missing_tenant");

		await upsertSubscription({ tenantId, customerId: session.customer, sub: session.subscription });
		throw redirect(307, "/admin?welcome=true");
	} catch (err) {
		if (err && typeof err === "object" && "status" in err) throw err;
		throw redirect(307, "/billing?error=payment_failed");
	}
};
