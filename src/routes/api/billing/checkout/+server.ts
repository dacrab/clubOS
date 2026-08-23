import { json } from "@sveltejs/kit";
import { clerkClient } from "svelte-clerk/server";
import { env } from "$env/dynamic/private";
import { PLANS_META } from "$lib/config/plans";
import { CheckoutBodySchema } from "$lib/schemas";
import { resolveUserContext } from "$lib/server/auth";
import { createCheckout } from "$lib/server/polar";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, locals, url }) => {
	const userId = locals.userId;
	if (!userId) return json({ error: "Unauthorized" }, { status: 401 });

	const parsed = CheckoutBodySchema.safeParse(await request.json().catch(() => ({})));
	if (!parsed.success) return json({ error: "Invalid request body" }, { status: 400 });
	const { planId } = parsed.data;

	const plan = PLANS_META.find((p) => p.id === planId);
	if (!plan) return json({ error: "Invalid plan" }, { status: 400 });

	const ctx = await resolveUserContext(userId);
	const role = ctx.membership?.role;
	if (!ctx.membership || (role !== "owner" && role !== "admin"))
		return json({ error: "Forbidden" }, { status: 403 });
	const tenantId = ctx.membership.tenantId;

	try {
		let email = "";
		try {
			const clerkUser = await clerkClient.users.getUser(userId);
			email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
		} catch {
			// Checkout still works without a prefilled customer email.
		}

		// Configured ORIGIN wins; otherwise the request URL (never raw headers).
		const base = env.ORIGIN ?? url.origin;
		const checkout = await createCheckout({
			productId: plan.productId,
			email,
			userId,
			tenantId: tenantId ?? undefined,
			successUrl: `${base}/api/billing/success?checkout_id={CHECKOUT_ID}`,
			cancelUrl: `${base}/billing`,
		});

		return json({ url: checkout.url });
	} catch (err) {
		return json(
			{ error: err instanceof Error ? err.message : "Payment setup failed" },
			{ status: 500 },
		);
	}
};
