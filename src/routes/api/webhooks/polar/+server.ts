import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { PLANS_META } from "$lib/config/plans";
import { safeMeta, safeStr, toIso, upsertSubscription, validateStatus } from "$lib/server/polar";
import type { RequestHandler } from "./$types";

const enc = new TextEncoder();
const toHex = (buf: ArrayBuffer): string =>
	Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");

function constantTimeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
}

async function verifySignature(payload: string, header: string, secret: string): Promise<boolean> {
	const parts = Object.fromEntries(
		header.split(",").map((p) => {
			const [k, ...rest] = p.split("=");
			return [k, rest.join("=")] as [string, string];
		}),
	);
	const { t: timestamp, v1: sig } = parts;
	if (!(timestamp && sig)) return false;
	if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

	const key = await crypto.subtle.importKey(
		"raw",
		enc.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signed = await crypto.subtle.sign("HMAC", key, enc.encode(`${timestamp}.${payload}`));
	return constantTimeEqual(toHex(signed), sig);
}

function firstProductId(products: unknown): string | null {
	if (!Array.isArray(products) || products.length === 0) return null;
	const first = products[0];
	return first && typeof first === "object" ? safeStr((first as Record<string, unknown>).id) : null;
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
		status: validateStatus(args.status),
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

	const event: unknown = JSON.parse(body);
	const eventType = safeStr(
		event && typeof event === "object" ? (event as Record<string, unknown>).type : null,
	);
	const eventData: Record<string, unknown> =
		event && typeof event === "object"
			? { ...((event as Record<string, unknown>).data as Record<string, unknown> | undefined) }
			: {};

	switch (eventType) {
		case "checkout.created":
		case "checkout.updated": {
			const status = safeStr(eventData.status);
			const subId = safeStr(eventData.subscription_id);
			if (status === "succeeded" && subId) {
				const meta = safeMeta(eventData.customer_metadata);
				const tenantId = meta?.tenant_id ?? null;
				if (!tenantId) break;

				const productId = firstProductId(eventData.products);
				const plan = productId ? PLANS_META.find((p) => p.productId === productId) : undefined;
				await syncSubscription(tenantId, {
					customerId: safeStr(eventData.customer_id) ?? undefined,
					subscriptionId: subId,
					status: "active",
					planName: plan?.name,
					currentPeriodEnd: toIso(eventData.current_period_end),
				});
			}
			break;
		}
		case "subscription.active":
		case "subscription.updated": {
			const meta = safeMeta(eventData.customer_metadata);
			const tenantId = meta?.tenant_id ?? null;
			if (!tenantId) break;

			const productId = safeStr(eventData.product_id);
			const plan = productId ? PLANS_META.find((p) => p.productId === productId) : undefined;
			await syncSubscription(tenantId, {
				customerId: safeStr(eventData.customer_id) ?? undefined,
				subscriptionId: safeStr(eventData.id) ?? undefined,
				status: safeStr(eventData.status) ?? "active",
				planName: plan?.name,
				currentPeriodEnd: toIso(eventData.current_period_end),
			});
			break;
		}
		case "subscription.canceled":
		case "subscription.revoked": {
			const meta = safeMeta(eventData.customer_metadata);
			const tenantId = meta?.tenant_id ?? null;
			if (!tenantId) break;

			await syncSubscription(tenantId, {
				customerId: safeStr(eventData.customer_id) ?? undefined,
				subscriptionId: safeStr(eventData.id) ?? undefined,
				status: "canceled",
			});
			break;
		}
	}

	return json({ received: true });
};
