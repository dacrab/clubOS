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
	const parts = Object.fromEntries(
		header.split(",").map((p) => {
			const [k, ...rest] = p.split("=");
			return [k, rest.join("=")] as [string, string];
		}),
	);
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

function safeStr(val: unknown): string | null {
	return typeof val === "string" ? val : null;
}

function safeMeta(val: unknown): Record<string, string> | null {
	if (!val || typeof val !== "object") return null;
	const r = val as Record<string, unknown>;
	if (typeof r.tenant_id !== "string") return null;
	const result: Record<string, string> = {};
	for (const [k, v] of Object.entries(r)) {
		if (typeof v === "string") result[k] = v;
	}
	return result;
}

function safeData(val: unknown): Record<string, unknown> {
	if (!val || typeof val !== "object") return {};
	const result: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(val)) {
		result[k] = v;
	}
	return result;
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

function toIso(value: unknown): string | null {
	return typeof value === "string" ? new Date(value).toISOString() : null;
}

function firstProductId(products: unknown): string | null {
	if (!Array.isArray(products) || products.length === 0) return null;
	const first = products[0];
	return first && typeof first === "object"
		? safeStr(Object.hasOwn(first, "id") ? (first as Record<string, unknown>).id : null)
		: null;
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
	const rawData =
		event && typeof event === "object" ? (event as Record<string, unknown>).data : null;
	const eventData = safeData(rawData);
	const admin = getSupabaseAdmin();

	switch (eventType) {
		case "checkout.created":
		case "checkout.updated": {
			const status = safeStr(eventData.status);
			const subId = safeStr(eventData.subscription_id);
			if (status === "succeeded" && subId) {
				const sub = await polarGet<Record<string, unknown>>(`/subscriptions/${subId}`);
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
					currentPeriodEnd: toIso(sub.current_period_end),
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
		case "subscription.canceled": {
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
		case "subscription.revoked": {
			const meta = safeMeta(eventData.customer_metadata);
			const tenantId = meta?.tenant_id ?? null;
			if (!tenantId) break;

			const subId = safeStr(eventData.id);
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
