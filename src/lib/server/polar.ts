import { env } from "$env/dynamic/private";
import { getSupabaseAdmin } from "$lib/server/supabase-admin";

const POLAR_BASE = "https://api.polar.sh/v1";

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

export async function polarPost<T = unknown>(
	path: string,
	body: Record<string, unknown>,
): Promise<T> {
	const res = await fetch(`${POLAR_BASE}${path}`, {
		method: "POST",
		headers: polarHeaders(),
		body: JSON.stringify(body),
	});
	const data = await res.json();
	if (!res.ok) {
		const msg = data.detail?.[0]?.msg || data.error || "Polar API error";
		throw new Error(msg);
	}
	return data as T;
}

export async function polarGet<T = unknown>(path: string): Promise<T> {
	const res = await fetch(`${POLAR_BASE}${path}`, {
		headers: { Authorization: `Bearer ${polarToken()}` },
	});
	const data = await res.json();
	if (!res.ok) {
		const msg = data.detail?.[0]?.msg || data.error || "Polar API error";
		throw new Error(msg);
	}
	return data as T;
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
	const {
		tenantId,
		customerId,
		subscriptionId,
		status,
		planName,
		currentPeriodEnd,
		trialStart,
		trialEnd,
	} = args;
	const { error } = await getSupabaseAdmin().from("subscriptions").upsert(
		{
			tenant_id: tenantId,
			polar_customer_id: customerId,
			polar_subscription_id: subscriptionId,
			status,
			plan_name: planName,
			current_period_end: currentPeriodEnd,
			trial_start: trialStart,
			trial_end: trialEnd,
		},
		{ onConflict: "tenant_id" },
	);
	if (error) throw new Error(error.message);
}
