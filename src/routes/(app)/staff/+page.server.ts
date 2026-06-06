import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { user, activeSession } = await parent();
	const { supabase } = locals;
	const fid = user.facilityId;

	const [{ data: recentOrders }, { data: products }, { data: categories }] = await Promise.all([
		activeSession
			? supabase
					.from("orders")
					.select(
						"id, total_amount, created_at, subtotal, discount_amount, coupon_count, order_items(id, quantity, unit_price, line_total, is_treat, is_deleted, products(id, name))",
					)
					.eq("session_id", activeSession.id)
					.order("created_at", { ascending: false })
					.limit(5)
			: Promise.resolve({ data: [] }),
		supabase.from("products").select("*").eq("facility_id", fid).order("name"),
		supabase
			.from("categories")
			.select("id, name, parent_id, description")
			.eq("facility_id", fid)
			.order("name"),
	]);

	return {
		recentOrders: recentOrders ?? [],
		products: products ?? [],
		categories: categories ?? [],
		activeSession,
	};
};
