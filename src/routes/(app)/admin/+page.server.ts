import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { user } = await parent();
	const { supabase } = locals;
	const fid = user.facilityId;

	const [{ data: dashboard }, { data: products }, { data: categories }, { data: activeSession }] = await Promise.all([
		supabase.rpc("get_dashboard_data", { p_facility_id: fid }),
		supabase.from("products").select("*").eq("facility_id", fid).order("name"),
		supabase.from("categories").select("id, name, parent_id").eq("facility_id", fid),
		supabase.from("register_sessions").select("*").eq("facility_id", fid).is("closed_at", null).limit(1).maybeSingle(),
	]);

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
			revenueByDay: (d.revenueByDay ?? []).map((r: { date: string; revenue: number }) => ({ date: r.date, revenue: Number(r.revenue) })),
			bestSellers: (d.bestSellers ?? []).map((p: { id: string; name: string; quantity: number; categoryId: string }) => ({ id: p.id, name: p.name, quantity: Number(p.quantity), categoryId: p.categoryId })),
			categorySales: (d.categorySales ?? []).map((c: { name: string; quantity: number }) => ({ name: c.name, quantity: Number(c.quantity) })),
		},
		products: products ?? [],
		categories: categories ?? [],
		activeSession,
	};
};
