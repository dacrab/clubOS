import { redirect } from "@sveltejs/kit";
import { PLANS_META } from "$lib/config/plans";
import { getCheckout, upsertSubscription } from "$lib/server/polar";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url, locals }) => {
	const checkoutId = url.searchParams.get("checkout_id");
	if (!checkoutId) throw redirect(307, "/billing");

	try {
		const checkout = await getCheckout(checkoutId);
		const checkoutData = checkout as Record<string, unknown>;
		const customerId = checkoutData.customer_id as string | null;
		const subscriptionId = checkoutData.subscription_id as string | null;
		const metadata = checkoutData.customer_metadata as Record<string, string> | null;
		const tenantId = metadata?.tenant_id;
		const productId = (checkoutData.products as Array<{ id: string }> | undefined)?.[0]?.id;

		if (!productId || !tenantId || !customerId || !subscriptionId || !locals.user) {
			throw redirect(307, "/billing?error=missing_data");
		}

		const plan = PLANS_META.find((p) => p.productId === productId);
		await upsertSubscription({
			tenantId,
			customerId,
			subscriptionId,
			status: "active",
			planName: plan?.name ?? "Subscription",
			currentPeriodEnd: null,
			trialStart: null,
			trialEnd: null,
		});

		throw redirect(307, "/admin?welcome=true");
	} catch (err) {
		if (err && typeof err === "object" && "status" in err) throw err;
		throw redirect(307, "/billing?error=payment_failed");
	}
};
