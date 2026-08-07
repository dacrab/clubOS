import { resolveUserContext } from "$lib/server/auth";
import { fetchPlans } from "$lib/server/plans";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.userId;
	if (!userId) return { user: null, tenantId: null, plans: [] };

	const ctx = await resolveUserContext(userId);
	const plans = fetchPlans();

	return {
		user: { id: userId, email: "" },
		tenantId: ctx.membership?.tenantId ?? null,
		plans,
	};
};
