import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { user } = await parent();
	const { supabase } = locals;

	const [
		{ data: products },
		{ data: categories },
		{ data: activeSession },
		{ data: recentOrders },
	] = await Promise.all([
		// Products
		supabase.from("products").select("*").order("name"),

		// Categories
		supabase.from("categories").select("id, name, parent_id").eq("facility_id", user.facilityId),

		// Active register session
		supabase
			.from("register_sessions")
			.select("*")
			.is("closed_at", null)
			.order("opened_at", { ascending: false })
			.limit(1)
			.maybeSingle(),

		// Recent orders with items
		supabase
			.from("orders")
			.select(`
				id, total_amount, created_at, subtotal, discount_amount, coupon_count,
				order_items(id, quantity, unit_price, line_total, is_treat, is_deleted, products(id, name))
			`)
			.order("created_at", { ascending: false })
			.limit(5),
	]);

	return {
		products: products ?? [],
		categories: categories ?? [],
		activeSession,
		recentOrders: recentOrders ?? [],
	};
};
