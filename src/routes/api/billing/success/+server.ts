import { redirect } from "@sveltejs/kit";
import { PLANS_META } from "$lib/config/plans";
import { getCheckout, upsertSubscription } from "$lib/server/polar";
import type { RequestHandler } from "./$types";

function safeStr(val: unknown): string | null {
	return typeof val === "string" ? val : null;
}

function toStringRecord(val: unknown): Record<string, string> | null {
	if (!val || typeof val !== "object") return null;
	const result: Record<string, string> = {};
	for (const [k, v] of Object.entries(val)) {
		if (typeof v === "string") result[k] = String(v);
	}
	return result;
}

function safeMeta(val: unknown): Record<string, string> | null {
	const r = toStringRecord(val);
	return r && typeof r.tenant_id === "string" ? r : null;
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
