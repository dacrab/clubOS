import { json } from "@sveltejs/kit";
import { PLANS_META } from "$lib/config/plans";
import { CheckoutBodySchema } from "$lib/schemas";
import { createCheckout } from "$lib/server/polar";
import { getSupabaseAdmin } from "$lib/server/supabase-admin";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: "Unauthorized" }, { status: 401 });
	const claims = locals.user;
	const parsed = CheckoutBodySchema.safeParse(await request.json().catch(() => ({})));
	if (!parsed.success) return json({ error: "Invalid request body" }, { status: 400 });
	const { planId } = parsed.data;

	const plan = PLANS_META.find((p) => p.id === planId);
	if (!plan) return json({ error: "Invalid plan" }, { status: 400 });

	// Derive tenantId server-side from the authenticated session. Body-trust was
	// the previous bug — a caller could pass any tenantId and bind a subscription
	// to a tenant they didn't own.
	const admin = getSupabaseAdmin();
	const { data: ctx } = await admin.rpc("get_user_context", { p_user_id: claims.id });
	const tenantId = ctx?.membership?.tenantId ?? null;

	try {
		const origin = request.headers.get("origin") ?? "http://localhost:5173";
		const checkout = await createCheckout({
			productId: plan.productId,
			email: claims.email ?? "",
			userId: claims.id,
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
