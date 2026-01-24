import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { user } = await parent();
	const { supabase } = locals;

	const { data } = await supabase.rpc("get_register_sessions", { p_facility_id: user.facilityId });

	return {
		sessions: data?.sessions ?? [],
		orders: data?.orders ?? [],
	};
};
