import { json } from "@sveltejs/kit";
import { PLANS_META } from "$lib/config/plans";
import { CheckoutBodySchema } from "$lib/schemas";
import { resolveUserContext } from "$lib/server/auth";
import { createCheckout } from "$lib/server/polar";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, locals }) => {
	const userId = locals.userId;
	if (!userId) return json({ error: "Unauthorized" }, { status: 401 });

	const parsed = CheckoutBodySchema.safeParse(await request.json().catch(() => ({})));
	if (!parsed.success) return json({ error: "Invalid request body" }, { status: 400 });
	const { planId } = parsed.data;

	const plan = PLANS_META.find((p) => p.id === planId);
	if (!plan) return json({ error: "Invalid plan" }, { status: 400 });

	const ctx = await resolveUserContext(userId);
	const tenantId = ctx.membership?.tenantId ?? undefined;

	try {
		const origin = request.headers.get("origin") ?? "http://localhost:5173";
		const checkout = await createCheckout({
			productId: plan.productId,
			email: "",
			userId,
			tenantId,
			successUrl: `${origin}/api/billing/success?checkout_id={CHECKOUT_ID}`,
			cancelUrl: `${origin}/billing`,
		});

		return json({ url: checkout.url });
	} catch (err) {
		return json(
			{ error: err instanceof Error ? err.message : "Payment setup failed" },
			{ status: 500 },
		);
	}
};
