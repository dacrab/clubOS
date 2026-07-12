import { getSupabaseAdmin } from "$lib/server/supabase-admin";

const POLAR_BASE = "https://api.polar.sh/v1";

function polarToken(): string {
	const token = process.env.POLAR_ACCESS_TOKEN;
	if (!token) throw new Error("POLAR_ACCESS_TOKEN is not set");
	return token;
}

async function polarRequest<T = unknown>(
	method: "GET" | "POST",
	path: string,
	body?: Record<string, unknown>,
): Promise<T> {
	const res = await fetch(`${POLAR_BASE}${path}`, {
		method,
		headers: {
			Authorization: `Bearer ${polarToken()}`,
			"Content-Type": "application/json",
		},
		body: body ? JSON.stringify(body) : undefined,
	});
	const data = await res.json();
	if (!res.ok) {
		const msg = data.detail?.[0]?.msg || data.error || "Polar API error";
		throw new Error(msg);
	}
	return data as T;
}

export function polarPost<T = unknown>(path: string, body: Record<string, unknown>): Promise<T> {
	return polarRequest<T>("POST", path, body);
}

export function polarGet<T = unknown>(path: string): Promise<T> {
	return polarRequest<T>("GET", path);
}

export async function createCheckout(args: {
	productId: string;
	email: string;
	userId: string;
	tenantId?: string;
	successUrl: string;
	cancelUrl: string;
}): Promise<{ url: string }> {
	return polarPost<{ url: string }>("/checkouts/", {
		products: [args.productId],
		customer_email: args.email,
		customer_metadata: { user_id: args.userId, tenant_id: args.tenantId },
		success_url: args.successUrl,
		cancel_url: args.cancelUrl,
	});
}

export async function getCheckout(checkoutId: string): Promise<Record<string, unknown>> {
	return polarGet(`/checkouts/${checkoutId}`);
}

export async function upsertSubscription(args: {
	tenantId: string;
	customerId: string;
	subscriptionId: string;
	status: string;
	planName: string;
	currentPeriodEnd: string | null;
	trialStart: string | null;
	trialEnd: string | null;
}): Promise<void> {
	const { error } = await getSupabaseAdmin().from("subscriptions").upsert(
		{
			tenant_id: args.tenantId,
			polar_customer_id: args.customerId,
			polar_subscription_id: args.subscriptionId,
			status: args.status,
			plan_name: args.planName,
			current_period_end: args.currentPeriodEnd,
			trial_start: args.trialStart,
			trial_end: args.trialEnd,
		},
		{ onConflict: "tenant_id" },
	);
	if (error) throw new Error(error.message);
}
