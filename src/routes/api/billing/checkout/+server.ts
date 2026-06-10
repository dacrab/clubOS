import { json } from "@sveltejs/kit";
import { PLANS_META } from "$lib/config/plans";
import { createCheckout } from "$lib/server/polar";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request }) => {
	const { planId, userId, email, tenantId } = (await request.json()) as {
		planId: string;
		userId: string;
		email: string;
		tenantId?: string;
	};

	if (!planId || !userId || !email)
		return json({ error: "Missing required fields" }, { status: 400 });

	const plan = PLANS_META.find((p) => p.id === planId);
	if (!plan) return json({ error: "Invalid plan" }, { status: 400 });

	try {
		const origin = request.headers.get("origin") ?? "http://localhost:5173";
		const checkout = await createCheckout({
			productId: plan.productId,
			email,
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
