import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { env } from "$env/dynamic/private";
import { getSupabaseAdmin } from "$lib/server/supabase-admin";
import { stripeGet, upsertSubscription, ts, type StripeSubscription } from "$lib/server/stripe";

const enc = new TextEncoder();
const toHex = (buf: ArrayBuffer): string =>
	Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");

async function verifySignature(payload: string, header: string, secret: string): Promise<boolean> {
	const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
	const { t: timestamp, v1: sig } = parts;
	if (!timestamp || !sig) return false;
	if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

	const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
	const signed = await crypto.subtle.sign("HMAC", key, enc.encode(`${timestamp}.${payload}`));
	return toHex(signed) === sig;
}

export const POST: RequestHandler = async ({ request }) => {
	const STRIPE_SECRET_KEY = env.STRIPE_SECRET_KEY;
	const STRIPE_WEBHOOK_SECRET = env.STRIPE_WEBHOOK_SECRET;
	if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
		return json({ error: "Stripe not configured" }, { status: 500 });
	}

	const body = await request.text();
	const sig = request.headers.get("stripe-signature") ?? "";
	if (!(await verifySignature(body, sig, STRIPE_WEBHOOK_SECRET))) {
		return json({ error: "Invalid signature" }, { status: 400 });
	}

	const event = JSON.parse(body);
	const admin = getSupabaseAdmin();

	switch (event.type) {
		case "checkout.session.completed": {
			const session = event.data.object;
			if (session.mode !== "subscription" || !session.subscription) break;
			const sub = await stripeGet<StripeSubscription>(`/subscriptions/${session.subscription}`, STRIPE_SECRET_KEY);
			const tenantId = sub.metadata?.tenant_id;
			if (!tenantId) break;
			await upsertSubscription({ tenantId, customerId: session.customer, sub });
			break;
		}
		case "customer.subscription.updated":
		case "customer.subscription.deleted": {
			const sub = event.data.object as StripeSubscription;
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
			const subId = event.data.object.subscription;
			if (!subId) break;
			await admin.from("subscriptions").update({ status: "past_due" }).eq("stripe_subscription_id", subId);
			break;
		}
	}

	return json({ received: true });
};
