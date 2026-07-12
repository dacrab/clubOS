import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { PLANS_META } from "$lib/config/plans";
import { polarGet, upsertSubscription } from "$lib/server/polar";
import { getSupabaseAdmin } from "$lib/server/supabase-admin";
import type { RequestHandler } from "./$types";

const enc = new TextEncoder();
const toHex = (buf: ArrayBuffer): string =>
	Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");

async function verifySignature(payload: string, header: string, secret: string): Promise<boolean> {
	const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
	const { t: timestamp, v1: sig } = parts;
	if (!timestamp || !sig) return false;
	if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

	const key = await crypto.subtle.importKey(
		"raw",
		enc.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signed = await crypto.subtle.sign("HMAC", key, enc.encode(`${timestamp}.${payload}`));
	return toHex(signed) === sig;
}

function findPlanByProductId(productId: string) {
	return PLANS_META.find((p) => p.productId === productId);
}

function toIso(value: unknown): string | null {
	return value ? new Date(value as string).toISOString() : null;
}

async function syncSubscription(
	tenantId: string,
	args: {
		customerId?: string;
		subscriptionId?: string;
		status: string;
		planName?: string;
		currentPeriodEnd?: string | null;
	},
): Promise<void> {
	await upsertSubscription({
		tenantId,
		customerId: args.customerId ?? "",
		subscriptionId: args.subscriptionId ?? "",
		status: args.status,
		planName: args.planName ?? "Subscription",
		currentPeriodEnd: args.currentPeriodEnd ?? null,
		trialStart: null,
		trialEnd: null,
	});
}

export const POST: RequestHandler = async ({ request }) => {
	const secret = env.POLAR_WEBHOOK_SECRET;
	if (!secret) {
		return json({ error: "Polar webhook secret not configured" }, { status: 500 });
	}

	const body = await request.text();
	const sig = request.headers.get("webhook-signature") ?? "";
	if (!(await verifySignature(body, sig, secret))) {
		return json({ error: "Invalid signature" }, { status: 400 });
	}

	const event = JSON.parse(body);
	const admin = getSupabaseAdmin();

	switch (event.type) {
		case "checkout.created":
		case "checkout.updated": {
			if (event.data.status === "succeeded" && event.data.subscription_id) {
				const sub = await polarGet<Record<string, unknown>>(
					`/subscriptions/${event.data.subscription_id}`,
				);
				const metadata = event.data.customer_metadata as Record<string, string> | undefined;
				const tenantId = metadata?.tenant_id;
				if (!tenantId) break;

				const productId = (event.data.products as Array<{ id: string }> | undefined)?.[0]?.id;
				const plan = productId ? findPlanByProductId(productId) : undefined;
				await syncSubscription(tenantId, {
					customerId: event.data.customer_id,
					subscriptionId: event.data.subscription_id,
					status: "active",
					planName: plan?.name,
					currentPeriodEnd: toIso(sub.current_period_end),
				});
			}
			break;
		}
		case "subscription.active":
		case "subscription.updated": {
			const subData = event.data;
			const meta = subData.customer_metadata as Record<string, string> | undefined;
			const tenantId = meta?.tenant_id;
			if (!tenantId) break;

			const productId = subData.product_id as string | undefined;
			const plan = productId ? findPlanByProductId(productId) : undefined;
			await syncSubscription(tenantId, {
				customerId: subData.customer_id,
				subscriptionId: subData.id,
				status: subData.status ?? "active",
				planName: plan?.name,
				currentPeriodEnd: toIso(subData.current_period_end),
			});
			break;
		}
		case "subscription.canceled": {
			const subData = event.data;
			const meta = subData.customer_metadata as Record<string, string> | undefined;
			const tenantId = meta?.tenant_id;
			if (!tenantId) break;

			await syncSubscription(tenantId, {
				customerId: subData.customer_id,
				subscriptionId: subData.id,
				status: "canceled",
			});
			break;
		}
		case "subscription.revoked": {
			const subData = event.data;
			const meta = subData.customer_metadata as Record<string, string> | undefined;
			const tenantId = meta?.tenant_id;
			if (!tenantId) break;

			const subId = subData.id as string | undefined;
			if (subId) {
				await admin
					.from("subscriptions")
					.update({ status: "past_due" })
					.eq("polar_subscription_id", subId);
			}
			break;
		}
	}

	return json({ received: true });
};
