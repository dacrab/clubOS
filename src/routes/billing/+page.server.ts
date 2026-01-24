import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const { user, supabase } = locals;

	if (!user) {
		throw redirect(307, "/");
	}

	const { data: membership } = await supabase
		.from("memberships")
		.select("tenant_id, role")
		.eq("user_id", user.id)
		.order("is_primary", { ascending: false })
		.limit(1)
		.single();

	let subscription = null;
	if (membership?.tenant_id) {
		const { data } = await supabase
			.from("subscriptions")
			.select("status, plan_name, current_period_end, trial_end, stripe_customer_id")
			.eq("tenant_id", membership.tenant_id)
			.single();
		subscription = data;
	}

	return {
		user: {
			id: user.id,
			email: user.email,
		},
		tenantId: membership?.tenant_id ?? null,
		subscription,
	};
};
