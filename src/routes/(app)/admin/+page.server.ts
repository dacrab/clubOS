import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { user, products, categories, activeSession } = await parent();
	const { supabase } = locals;
	const fid = user.facilityId;

	const { data: dashboard } = await supabase.rpc("get_dashboard_data", { p_facility_id: fid });

	const d = dashboard ?? { stats: {}, revenueByDay: [], bestSellers: [], categorySales: [], recentOrders: [] };

	return {
		stats: {
			todayRevenue: Number(d.stats?.todayRevenue ?? 0),
			todayOrders: Number(d.stats?.todayOrders ?? 0),
			lowStockCount: Number(d.stats?.lowStockCount ?? 0),
			activeUsers: Number(d.stats?.activeUsers ?? 0),
		},
		recentOrders: d.recentOrders ?? [],
		analytics: {
			revenueByDay: (d.revenueByDay ?? []).map((r: { date: string; revenue: number }) => ({ ...r, revenue: Number(r.revenue) })),
			bestSellers: (d.bestSellers ?? []).map((p: { id: string; name: string; quantity: number; categoryId: string }) => ({ ...p, quantity: Number(p.quantity) })),
			categorySales: (d.categorySales ?? []).map((c: { name: string; quantity: number }) => ({ ...c, quantity: Number(c.quantity) })),
		},
		products,
		categories,
		activeSession,
	};
};
