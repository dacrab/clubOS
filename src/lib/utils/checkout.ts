export interface StartCheckoutArgs {
	planId: string;
	userId: string;
	email: string;
	tenantId: string | null;
}

export async function startCheckout(args: StartCheckoutArgs): Promise<string> {
	const res = await fetch("/api/billing/checkout", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			planId: args.planId,
			userId: args.userId,
			email: args.email,
			tenantId: args.tenantId,
		}),
	});
	let body: { url?: string; error?: string };
	try {
		body = await res.json();
	} catch {
		throw new Error(`Unexpected response: ${res.status} ${res.statusText}`);
	}
	if (!res.ok || body.error) throw new Error(body.error ?? "Checkout request failed");
	if (!body.url) throw new Error("Checkout response missing URL");
	return body.url;
}
