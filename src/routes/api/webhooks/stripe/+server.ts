import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { env } from "$env/dynamic/private";
import { getSupabaseAdmin } from "$lib/server/supabase-admin";

const ts = (s: number): string => new Date(s * 1000).toISOString();

async function stripeGet(path: string, key: string): Promise<Record<string, unknown>> {
	const res = await fetch(`https://api.stripe.com/v1${path}`, {
		headers: { Authorization: `Bearer ${key}` },
	});
	return res.json();
}

function computeHmac(secret: string, payload: string): Promise<string> {
	return crypto.subtle
		.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
		.then((key) => crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)))
		.then((sig) => Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join(""));
}

async function verifySignature(payload: string, header: string, secret: string): Promise<boolean> {
	const parts = Object.fromEntries(header.split(",").map((p) => { const [k, v] = p.split("="); return [k, v]; }));
	const timestamp = parts.t;
	const sig = parts.v1;
	if (!timestamp || !sig) return false;
	// Reject if older than 5 minutes
	if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
	const expected = await computeHmac(secret, `${timestamp}.${payload}`);
	return expected === sig;
}

export const POST: RequestHandler = async ({ request }) => {
	const STRIPE_SECRET_KEY = env.STRIPE_SECRET_KEY;
	const STRIPE_WEBHOOK_SECRET = env.STRIPE_WEBHOOK_SECRET;
	if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
		return json({ error: "Stripe not configured" }, { status: 500 });
	}

	const body = await request.text();
	const sig = request.headers.get("stripe-signature") ?? "";

	const valid = await verifySignature(body, sig, STRIPE_WEBHOOK_SECRET);
	if (!valid) return json({ error: "Invalid signature" }, { status: 400 });

	const event = JSON.parse(body);
	const admin = getSupabaseAdmin();

	switch (event.type) {
		case "checkout.session.completed": {
			const session = event.data.object;
			if (session.mode !== "subscription" || !session.subscription) break;
			// Fetch full subscription
			const sub = await stripeGet(`/subscriptions/${session.subscription}`, STRIPE_SECRET_KEY);
			const tenantId = sub.metadata?.tenant_id;
			if (!tenantId) break;
			await admin.from("subscriptions").upsert({
				tenant_id: tenantId,
				stripe_customer_id: session.customer,
				stripe_subscription_id: sub.id,
				stripe_price_id: sub.items?.data?.[0]?.price?.id ?? null,
				status: sub.status,
				plan_name: sub.items?.data?.[0]?.price?.nickname ?? "Subscription",
				current_period_start: ts(sub.current_period_start),
				current_period_end: ts(sub.current_period_end),
				cancel_at_period_end: sub.cancel_at_period_end ?? false,
				trial_start: sub.trial_start ? ts(sub.trial_start) : null,
				trial_end: sub.trial_end ? ts(sub.trial_end) : null,
			}, { onConflict: "tenant_id" });
			break;
		}
		case "customer.subscription.updated":
		case "customer.subscription.deleted": {
			const sub = event.data.object;
			const tenantId = sub.metadata?.tenant_id;
			if (!tenantId) break;
			await admin.from("subscriptions").update({
				status: sub.status,
				current_period_start: ts(sub.current_period_start),
				current_period_end: ts(sub.current_period_end),
				cancel_at_period_end: sub.cancel_at_period_end ?? false,
			}).eq("tenant_id", tenantId);
			break;
		}
		case "invoice.payment_failed": {
			const invoice = event.data.object;
			const subId = invoice.subscription;
			if (!subId) break;
			await admin.from("subscriptions").update({ status: "past_due" }).eq("stripe_subscription_id", subId);
			break;
		}
	}

	return json({ received: true });
};
