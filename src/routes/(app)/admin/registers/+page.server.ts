import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { user } = await parent();
	const { supabase } = locals;

	const [{ data: sessions }, { data: closings }] = await Promise.all([
		supabase
			.from("register_sessions")
			.select("*")
			.eq("facility_id", user.facilityId)
			.order("opened_at", { ascending: false })
			.limit(50),
		supabase
			.from("register_closings")
			.select("*")
			.eq("facility_id", user.facilityId),
	]);

	// Get orders with items for all sessions
	const sessionIds = sessions?.map((s) => s.id) ?? [];
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
		.in("session_id", sessionIds)
		.order("created_at", { ascending: false });

	return {
		sessions: sessions ?? [],
		closings: closings ?? [],
		orders: orders ?? [],
	};
};
