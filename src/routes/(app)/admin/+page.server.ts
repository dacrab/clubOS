import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { user, products, categories, activeSession } = await parent();
	const { supabase } = locals;
	const fid = user.facilityId;

	const { data: dashboard } = await supabase.rpc("get_dashboard_data", { p_facility_id: fid });

	const d = dashboard ?? { stats: {}, revenueByDay: [], bestSellers: [], categorySales: [], recentOrders: [] };

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
		products,
		categories,
		activeSession,
	};
};
