import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { supabase } = locals;
	const { user } = await parent();

	const { data: orders } = await supabase
		.from("orders")
		.select(`
			*,
			order_items (
				id,
				quantity,
				unit_price,
				line_total,
				is_treat,
				is_deleted,
				products (
					id,
					name
				)
			)
		`)
		.eq("facility_id", user.facilityId)
		.order("created_at", { ascending: false })
		.limit(100);

	return {
		orders: orders ?? [],
	};
};
