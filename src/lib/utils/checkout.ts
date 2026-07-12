export interface StartCheckoutArgs {
	planId: string;
	userId: string;
	email: string;
	tenantId: string | null;
}

/**
 * Kick off a Polar checkout session and return the redirect URL.
 * Throws on API error so callers can surface a toast.
 */
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
	const { url, error } = await res.json();
	if (error) throw new Error(error);
	return url;
}
