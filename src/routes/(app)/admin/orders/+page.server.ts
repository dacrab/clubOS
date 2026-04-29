import type { PageServerLoad } from "./$types";
import { ORDERS_LIMIT } from "$lib/types/database";

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { user } = await parent();
	const { supabase } = locals;

	const { data: orders } = await supabase
		.from("v_orders_list")
		.select("*")
		.eq("facility_id", user.facilityId)
		.order("created_at", { ascending: false })
		.limit(ORDERS_LIMIT);

	return { orders: orders ?? [] };
};
