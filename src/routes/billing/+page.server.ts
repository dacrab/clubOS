import { fetchPlansFromStripe } from "$lib/server/plans";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const { user, supabase } = locals;

	if (!user) return { user: null, tenantId: null, plans: [] };

	const { data: membership } = await supabase
		.from("memberships")
		.select("tenant_id")
		.eq("user_id", user.id)
		.order("is_primary", { ascending: false })
		.limit(1)
		.single();

	const plans = await fetchPlansFromStripe();

	return {
		user: { id: user.id, email: user.email },
		tenantId: membership?.tenant_id ?? null,
		plans,
	};
};
