import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { user } = await parent();
	const { supabase } = locals;
	const fid = user.facilityId;

	const [
		{ data: dailyStats },
		{ data: lowStock },
		{ count: activeUsers },
		{ data: recentOrders },
		{ data: weeklyRevenue },
		{ data: bestSellers },
		{ data: categories },
		{ data: products },
		{ data: activeSession },
	] = await Promise.all([
		supabase.from("v_daily_stats").select("*").eq("facility_id", fid).maybeSingle(),
		supabase.from("v_low_stock").select("count").eq("facility_id", fid).maybeSingle(),
		supabase.from("users").select("id", { count: "exact", head: true }),
		supabase.from("v_recent_orders").select("*").eq("facility_id", fid).order("created_at", { ascending: false }).limit(5),
		supabase.from("v_weekly_revenue").select("date, revenue").eq("facility_id", fid).order("date"),
		supabase.from("mv_best_sellers").select("*").eq("facility_id", fid).order("total_sold", { ascending: false }).limit(5),
		supabase.from("categories").select("id, name, parent_id").eq("facility_id", fid),
		supabase.from("products").select("*").eq("facility_id", fid).order("name"),
		supabase.from("register_sessions").select("*").eq("facility_id", fid).is("closed_at", null).limit(1).maybeSingle(),
	]);

	// Build 7-day revenue chart
	const today = new Date();
	const revenueByDay = Array.from({ length: 7 }, (_, i) => {
		const d = new Date(today);
		d.setDate(d.getDate() - (6 - i));
		const dateStr = d.toISOString().split("T")[0];
		const found = weeklyRevenue?.find((r) => r.date === dateStr);
		return { date: d.toLocaleDateString("en", { weekday: "short" }), revenue: Number(found?.revenue ?? 0) };
	});

	// Category sales from best sellers
	const categoryMap = new Map(categories?.map((c) => [c.id, c.name]) ?? []);
	const salesByCategory: Record<string, number> = {};
	bestSellers?.forEach((p) => {
		const name = p.category_id ? categoryMap.get(p.category_id) ?? "Uncategorized" : "Uncategorized";
		salesByCategory[name] = (salesByCategory[name] ?? 0) + Number(p.total_sold);
	});

	return {
		stats: {
			todayRevenue: Number(dailyStats?.revenue ?? 0),
			todayOrders: Number(dailyStats?.orders_count ?? 0),
			lowStockCount: Number(lowStock?.count ?? 0),
			activeUsers: activeUsers ?? 0,
		},
		recentOrders: recentOrders ?? [],
		analytics: {
			revenueByDay,
			bestSellers: bestSellers?.map((p) => ({ id: p.product_id, name: p.product_name, quantity: Number(p.total_sold), categoryId: p.category_id })) ?? [],
			categorySales: Object.entries(salesByCategory).map(([name, quantity]) => ({ name, quantity })).sort((a, b) => b.quantity - a.quantity),
		},
		products: products ?? [],
		categories: categories ?? [],
		activeSession,
	};
};
