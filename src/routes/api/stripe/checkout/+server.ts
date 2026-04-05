import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { env } from "$env/dynamic/private";

const STRIPE_BASE = "https://api.stripe.com/v1";

async function stripePost(path: string, key: string, params: Record<string, string>): Promise<{ id: string; url?: string; error?: { message: string } }> {
	const res = await fetch(`${STRIPE_BASE}${path}`, {
		method: "POST",
		headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams(params),
	});
	const data = await res.json();
	if (!res.ok) throw new Error(data.error?.message || `Stripe error on ${path}`);
	return data;
}

export const POST: RequestHandler = async ({ request, locals }) => {
	const { priceId, userId, email, tenantId } = await request.json() as { priceId: string; userId: string; email: string; tenantId: string };

	if (!priceId || !userId || !email) return json({ error: "Missing required fields" }, { status: 400 });

	const key = env.STRIPE_SECRET_KEY;
	if (!key) return json({ error: "Stripe not configured" }, { status: 500 });

	try {
		// Reuse existing Stripe customer if available
		let customerId: string;
		if (tenantId) {
			const { data: sub } = await locals.supabase.from("subscriptions").select("stripe_customer_id").eq("tenant_id", tenantId).single();
			if (sub?.stripe_customer_id && !sub.stripe_customer_id.startsWith("temp_")) {
				customerId = sub.stripe_customer_id;
			} else {
				const c = await stripePost("/customers", key, { email, "metadata[supabase_user_id]": userId, "metadata[tenant_id]": tenantId });
				customerId = c.id;
			}
		} else {
			const c = await stripePost("/customers", key, { email, "metadata[supabase_user_id]": userId });
			customerId = c.id;
		}

		const origin = request.headers.get("origin") ?? "http://localhost:5173";
		const session = await stripePost("/checkout/sessions", key, {
			customer: customerId,
			"line_items[0][price]": priceId,
			"line_items[0][quantity]": "1",
			mode: "subscription",
			success_url: `${origin}/api/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${origin}/billing`,
			"subscription_data[metadata][supabase_user_id]": userId,
			"subscription_data[metadata][tenant_id]": tenantId,
			allow_promotion_codes: "true",
		});

		return json({ url: session.url });
	} catch (err) {
		return json({ error: err instanceof Error ? err.message : "Payment setup failed" }, { status: 500 });
	}
};
