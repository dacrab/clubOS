import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { activeSession } = await parent();
	const { supabase } = locals;

	const { data: recentOrders } = await supabase
		.from("orders")
		.select(`
			id, total_amount, created_at, subtotal, discount_amount, coupon_count,
			order_items(id, quantity, unit_price, line_total, is_treat, is_deleted, products(id, name))
		`)
		.eq("session_id", activeSession?.id)
		.order("created_at", { ascending: false })
		.limit(5);

	return { recentOrders: recentOrders ?? [] };
};
