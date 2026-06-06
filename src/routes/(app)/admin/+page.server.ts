import { CATEGORIES_LIMIT, PRODUCTS_LIMIT } from "$lib/types/database";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { user, activeSession } = await parent();
	const { supabase } = locals;
	const fid = user.facilityId;

	const [{ data: dashboard }, { data: products }, { data: categories }] = await Promise.all([
		supabase.rpc("get_dashboard_data", { p_facility_id: fid }),
		supabase
			.from("products")
			.select("*")
			.eq("facility_id", fid)
			.order("name")
			.limit(PRODUCTS_LIMIT),
		supabase
			.from("categories")
			.select("id, name, parent_id, description")
			.eq("facility_id", fid)
			.order("name")
			.limit(CATEGORIES_LIMIT),
	]);

	const d = dashboard ?? {
		stats: {},
		revenueByDay: [],
		bestSellers: [],
		categorySales: [],
		recentOrders: [],
	};

	return {
		stats: {
			todayRevenue: d.stats?.todayRevenue ?? 0,
			todayOrders: d.stats?.todayOrders ?? 0,
			lowStockCount: d.stats?.lowStockCount ?? 0,
			activeUsers: d.stats?.activeUsers ?? 0,
		},
		recentOrders: d.recentOrders ?? [],
		analytics: {
			revenueByDay: d.revenueByDay ?? [],
			bestSellers: d.bestSellers ?? [],
			categorySales: d.categorySales ?? [],
		},
		products: products ?? [],
		categories: categories ?? [],
		activeSession,
	};
};
