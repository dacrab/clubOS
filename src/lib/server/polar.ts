import { z } from "zod";
import { env } from "$env/dynamic/private";
import { getDb } from "$lib/db/client";
import { subscriptions } from "$lib/db/schema/subscriptions";
import { SUBSCRIPTION_STATUSES, type SubscriptionStatus } from "$lib/types/database";

const POLAR_BASE = "https://api.polar.sh/v1";

function toTimestamp(value: Date | string | null): number | null {
	if (!value) return null;
	const ms = typeof value === "string" ? new Date(value).getTime() : value.getTime();
	return Number.isNaN(ms) ? null : ms;
}

function polarToken(): string {
	const token = env.POLAR_ACCESS_TOKEN;
	if (!token) throw new Error("POLAR_ACCESS_TOKEN is not set");
	return token;
}

let _polarHeaders: Record<string, string> | undefined;
function polarHeaders(): Record<string, string> {
	if (!_polarHeaders) {
		_polarHeaders = {
			Authorization: `Bearer ${polarToken()}`,
			"Content-Type": "application/json",
		};
	}
	return _polarHeaders;
}

async function polarRequest(path: string, init: RequestInit): Promise<unknown> {
	const res = await fetch(`${POLAR_BASE}${path}`, init);
	const data: unknown = await res.json();
	if (!res.ok) {
		const err = data as { detail?: { msg?: string }[]; error?: string };
		const msg = err.detail?.[0]?.msg || err.error || "Polar API error";
		throw new Error(msg);
	}
	return data;
}

export function polarPost(path: string, body: Record<string, unknown>): Promise<unknown> {
	return polarRequest(path, {
		method: "POST",
		headers: polarHeaders(),
		body: JSON.stringify(body),
	});
}

export function polarGet(path: string): Promise<unknown> {
	return polarRequest(path, { headers: { Authorization: `Bearer ${polarToken()}` } });
}

// Polar's success payloads are external contracts; validate instead of casting.
const CheckoutResponse = z.object({ url: z.string().url() });

export async function createCheckout(args: {
	productId: string;
	email: string;
	userId: string;
	tenantId?: string;
	successUrl: string;
	cancelUrl: string;
}): Promise<{ url: string }> {
	const data = await polarPost("/checkouts/", {
		products: [args.productId],
		customer_email: args.email,
		customer_metadata: {
			user_id: args.userId,
			...(args.tenantId ? { tenant_id: args.tenantId } : {}),
		},
		success_url: args.successUrl,
		cancel_url: args.cancelUrl,
	});
	const parsed = CheckoutResponse.safeParse(data);
	if (!parsed.success) {
		throw new Error(`Polar checkout response invalid: ${parsed.error.message}`);
	}
	return parsed.data;
}

export async function getCheckout(checkoutId: string): Promise<Record<string, unknown>> {
	const data = await polarGet(`/checkouts/${checkoutId}`);
	if (!data || typeof data !== "object") {
		throw new Error("Polar checkout response invalid: expected an object");
	}
	// Sound narrowing after the typeof guard; consumers narrow fields with safeStr/safeMeta.
	return data as Record<string, unknown>;
}

/** Unknown statuses fail closed so an unrecognized Polar status never grants access. */
export function validateStatus(s: string): SubscriptionStatus {
	return SUBSCRIPTION_STATUSES.includes(s as SubscriptionStatus)
		? (s as SubscriptionStatus)
		: "canceled";
}

export function safeStr(val: unknown): string | null {
	return typeof val === "string" ? val : null;
}

export function safeMeta(val: unknown): Record<string, string> | null {
	if (!val || typeof val !== "object") return null;
	if (typeof (val as Record<string, unknown>).tenant_id !== "string") return null;
	const result: Record<string, string> = {};
	for (const [k, v] of Object.entries(val)) {
		if (typeof v === "string") result[k] = v;
	}
	return result;
}

export function toIso(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const ms = Date.parse(value);
	return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

export function isActive(sub: typeof subscriptions.$inferSelect | null): boolean {
	if (!sub) return false;
	if (sub.status !== "trialing" && sub.status !== "active") return false;
	const now = Date.now();
	const periodEnd = toTimestamp(sub.currentPeriodEnd);
	const trialEnd = toTimestamp(sub.trialEnd);
	return (periodEnd !== null && periodEnd > now) || (trialEnd !== null && trialEnd > now);
}

export async function upsertSubscription(args: {
	tenantId: string;
	customerId: string;
	subscriptionId: string;
	status: SubscriptionStatus;
	planName: string;
	currentPeriodEnd: string | null;
	trialStart: string | null;
	trialEnd: string | null;
}): Promise<void> {
	const { tenantId, customerId, subscriptionId, status, planName, currentPeriodEnd, trialEnd } =
		args;
	const db = getDb();
	await db
		.insert(subscriptions)
		.values({
			tenantId,
			polarCustomerId: customerId,
			polarSubscriptionId: subscriptionId,
			status: validateStatus(status),
			planName,
			currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd) : null,
			trialEnd: trialEnd ? new Date(trialEnd) : null,
		})
		.onConflictDoUpdate({
			target: subscriptions.tenantId,
			set: {
				polarCustomerId: customerId,
				polarSubscriptionId: subscriptionId,
				status: validateStatus(status),
				planName,
				currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd) : null,
				trialEnd: trialEnd ? new Date(trialEnd) : null,
			},
		});
}
