import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { supabase } = locals;
	const { user } = await parent();

	const { data: orders } = await supabase
		.from("v_orders_list")
		.select("*")
		.eq("facility_id", user.facilityId)
		.order("created_at", { ascending: false })
		.limit(100);

	return {
		orders: orders ?? [],
	};
};
