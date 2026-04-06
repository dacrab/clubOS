import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const { user, supabase } = locals;

	if (!user) return { user: null, tenantId: null, subscription: null };

	const { data: membership } = await supabase
		.from("memberships")
		.select("tenant_id")
		.eq("user_id", user.id)
		.order("is_primary", { ascending: false })
		.limit(1)
		.single();

	const tenantId = membership?.tenant_id;
	let subscription = null;

	if (tenantId) {
		const { data } = await supabase
			.from("subscriptions")
			.select("status, plan_name, current_period_end, trial_end, stripe_customer_id")
			.eq("tenant_id", tenantId)
			.single();
		subscription = data;
	}

	return { user: { id: user.id, email: user.email }, tenantId, subscription };
};
