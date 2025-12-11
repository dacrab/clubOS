import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { env } from "$env/dynamic/private";

export const POST: RequestHandler = async ({ request, locals }) => {
	const { priceId, userId, email, tenantId } = await request.json();

	if (!priceId || !userId || !email) {
		return json({ error: "Missing required fields" }, { status: 400 });
	}

	const STRIPE_SECRET_KEY = env.STRIPE_SECRET_KEY;
	if (!STRIPE_SECRET_KEY) {
		return json({ error: "Stripe not configured" }, { status: 500 });
	}

	try {
		// Check if customer already exists
		let customerId: string;
		
		if (tenantId) {
			const { data: existingSub } = await locals.supabase
				.from("subscriptions")
				.select("stripe_customer_id")
				.eq("tenant_id", tenantId)
				.single();
			
			if (existingSub?.stripe_customer_id && !existingSub.stripe_customer_id.startsWith("temp_")) {
				customerId = existingSub.stripe_customer_id;
			} else {
				const customerRes = await fetch("https://api.stripe.com/v1/customers", {
					method: "POST",
					headers: {
						Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
						"Content-Type": "application/x-www-form-urlencoded",
					},
					body: new URLSearchParams({
						email,
						"metadata[supabase_user_id]": userId,
						"metadata[tenant_id]": tenantId,
					}),
				});

				const customer = await customerRes.json();
				if (!customerRes.ok) {
					throw new Error(customer.error?.message || "Failed to create customer");
				}
				customerId = customer.id;
			}
		} else {
			const customerRes = await fetch("https://api.stripe.com/v1/customers", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					email,
					"metadata[supabase_user_id]": userId,
				}),
			});

			const customer = await customerRes.json();
			if (!customerRes.ok) {
				throw new Error(customer.error?.message || "Failed to create customer");
			}
			customerId = customer.id;
		}

		const origin = request.headers.get("origin") || "http://localhost:5173";

		const sessionRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: new URLSearchParams({
				customer: customerId,
				"line_items[0][price]": priceId,
				"line_items[0][quantity]": "1",
				mode: "subscription",
				success_url: `${origin}/api/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
				cancel_url: `${origin}/billing`,
				"subscription_data[metadata][supabase_user_id]": userId,
				"subscription_data[metadata][tenant_id]": tenantId || "",
				allow_promotion_codes: "true",
			}),
		});

		const session = await sessionRes.json();
		if (!sessionRes.ok) {
			throw new Error(session.error?.message || "Failed to create checkout session");
		}

		return json({ url: session.url });
	} catch (err) {
		return json({ error: err instanceof Error ? err.message : "Payment setup failed" }, { status: 500 });
	}
};
