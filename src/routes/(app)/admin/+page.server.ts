import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { user } = await parent();
	const { supabase } = locals;

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	// Calculate date ranges
	const sevenDaysAgo = new Date(today);
	sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

	const thirtyDaysAgo = new Date(today);
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

	// Parallel queries for performance
	const [
		{ data: todayOrders },
		{ count: lowStockCount },
		{ count: activeUsers },
		{ data: recentOrders },
		{ data: weekOrders },
		{ data: bestSellerItems },
		{ data: categories },
		{ data: products },
		{ data: activeSession },
	] = await Promise.all([
		// Today's orders
		supabase
			.from("orders")
			.select("id, total_amount, created_at")
			.gte("created_at", today.toISOString())
			.order("created_at", { ascending: false }),

		// Low stock count
		supabase
			.from("products")
			.select("id", { count: "exact", head: true })
			.gte("stock_quantity", 0)
			.lte("stock_quantity", 3),

		// Active users
		supabase.from("users").select("id", { count: "exact", head: true }),

		// Recent orders with items
		supabase
			.from("orders")
			.select(`
				id, total_amount, created_at, created_by, subtotal, discount_amount, coupon_count,
				order_items(id, quantity, unit_price, line_total, is_treat, is_deleted, products(id, name))
			`)
			.order("created_at", { ascending: false })
			.limit(5),

		// Last 7 days orders for chart
		supabase
			.from("orders")
			.select("total_amount, created_at")
			.gte("created_at", sevenDaysAgo.toISOString())
			.order("created_at", { ascending: true }),

		// Best sellers (order items with product info)
		supabase
			.from("order_items")
			.select("product_id, quantity, products(id, name, category_id)")
			.eq("is_deleted", false)
			.gte("created_at", thirtyDaysAgo.toISOString()),

		// Categories for sales breakdown and new sale dialog
		supabase.from("categories").select("id, name, parent_id").eq("facility_id", user.facilityId),

		// Products for new sale dialog
		supabase.from("products").select("*").order("name"),

		// Active register session
		supabase
			.from("register_sessions")
			.select("*")
			.is("closed_at", null)
			.order("opened_at", { ascending: false })
			.limit(1)
			.maybeSingle(),
	]);

	const todayRevenue = todayOrders?.reduce((sum, o) => sum + Number(o.total_amount), 0) ?? 0;

	// Process weekly revenue data for chart
	const revenueByDay: { date: string; revenue: number }[] = [];
	for (let i = 6; i >= 0; i--) {
		const date = new Date(today);
		date.setDate(date.getDate() - i);
		const dateStr = date.toISOString().split("T")[0];

		const dayRevenue =
			weekOrders
				?.filter((o) => o.created_at.startsWith(dateStr))
				.reduce((sum, o) => sum + Number(o.total_amount), 0) ?? 0;

		revenueByDay.push({
			date: date.toLocaleDateString("en", { weekday: "short" }),
			revenue: dayRevenue,
		});
	}

	// Process best sellers
	type ProductInfo = { id: string; name: string; category_id: string | null };
	const productSales: Record<string, { name: string; quantity: number; categoryId: string | null }> = {};
	bestSellerItems?.forEach((item) => {
		const product = item.products as unknown as ProductInfo | null;
		if (product) {
			if (!productSales[product.id]) {
				productSales[product.id] = { name: product.name, quantity: 0, categoryId: product.category_id };
			}
			productSales[product.id].quantity += item.quantity;
		}
	});

	const bestSellers = Object.entries(productSales)
		.map(([id, data]) => ({ id, ...data }))
		.sort((a, b) => b.quantity - a.quantity)
		.slice(0, 5);

	// Process sales by category
	const categoryMap = new Map(categories?.map((c) => [c.id, c.name]) ?? []);
	const salesByCategory: Record<string, number> = { Uncategorized: 0 };

	Object.values(productSales).forEach((product) => {
		const categoryName = product.categoryId ? categoryMap.get(product.categoryId) ?? "Uncategorized" : "Uncategorized";
		salesByCategory[categoryName] = (salesByCategory[categoryName] ?? 0) + product.quantity;
	});

	const categorySales = Object.entries(salesByCategory)
		.filter(([, qty]) => qty > 0)
		.map(([name, quantity]) => ({ name, quantity }))
		.sort((a, b) => b.quantity - a.quantity);

	return {
		stats: {
			todayRevenue,
			todayOrders: todayOrders?.length ?? 0,
			lowStockCount: lowStockCount ?? 0,
			activeUsers: activeUsers ?? 0,
		},
		recentOrders: recentOrders ?? [],
		analytics: {
			revenueByDay,
			bestSellers,
			categorySales,
		},
		products: products ?? [],
		categories: categories ?? [],
		activeSession,
	};
};
