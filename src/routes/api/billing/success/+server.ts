import { redirect } from "@sveltejs/kit";
import { PLANS_META } from "$lib/config/plans";
import { getCheckout, safeMeta, safeStr, toIso, upsertSubscription } from "$lib/server/polar";
import type { RequestHandler } from "./$types";

function isRedirect(err: unknown): err is { status: number; location: string } {
	return typeof err === "object" && err !== null && "status" in err && "location" in err;
}

export const GET: RequestHandler = async ({ url, locals }) => {
	const checkoutId = url.searchParams.get("checkout_id");
	if (!checkoutId) throw redirect(307, "/billing");

	try {
		const checkoutData = await getCheckout(checkoutId);
		const customerId = safeStr(checkoutData.customer_id);
		const subscriptionId = safeStr(checkoutData.subscription_id);
		const metadata = safeMeta(checkoutData.customer_metadata);
		const tenantId = metadata?.tenant_id ?? null;
		const products = checkoutData.products;
		const productId =
			Array.isArray(products) && products.length > 0 ? safeStr(products[0]?.id) : null;

		if (!(productId && tenantId && customerId && subscriptionId && locals.userId)) {
			throw redirect(307, "/billing?error=missing_data");
		}

		const plan = PLANS_META.find((p) => p.productId === productId);
		await upsertSubscription({
			tenantId,
			customerId,
			subscriptionId,
			status: "active",
			planName: plan?.name ?? "Subscription",
			currentPeriodEnd: toIso(checkoutData.current_period_end),
			trialStart: null,
			trialEnd: null,
		});

		throw redirect(307, "/admin?welcome=true");
	} catch (err) {
		if (isRedirect(err)) throw err;
		throw redirect(307, "/billing?error=payment_failed");
	}
};
