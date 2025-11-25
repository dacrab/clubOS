import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals: { supabase, user } }) => {
	if (!user) return { stats: [] };

	// Get tenant
	const { data: member } = await supabase
		.from("tenant_members")
		.select("tenant_id")
		.eq("user_id", user.id)
		.limit(1)
		.maybeSingle();

	const tenantId = member?.tenant_id;
	if (!tenantId) return { stats: [] };

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	// Parallel fetch
	const [revenue, activeUsers, lowStock] = await Promise.all([
		supabase
			.from("orders")
			.select("total_amount")
			.eq("tenant_id", tenantId)
			.gte("created_at", today.toISOString()),
		supabase
			.from("tenant_members")
			.select("id", { count: "exact", head: true })
			.eq("tenant_id", tenantId),
		supabase
			.from("products")
			.select("id", { count: "exact", head: true })
			.eq("tenant_id", tenantId)
			.lt("stock_quantity", 5)
			.neq("stock_quantity", -1),
	]);

	// Calculate revenue
	const totalRevenue =
		revenue.data?.reduce((sum, order) => sum + (order.total_amount || 0), 0) ?? 0;

	return {
		stats: [
			{
				title: "dashboard.admin.revenue",
				value: `€${totalRevenue.toFixed(2)}`,
				accent: "green",
				// We'll pass the icon name and resolve it in the component or just pass a string if the component handles it.
				// Actually stats-cards.svelte expects a component or unknown. I can't pass components from server to client easily.
				// I'll pass a string 'icon' and handle it in the svelte component.
				iconName: "Euro",
			},
			{
				title: "admin.activeUsers",
				value: activeUsers.count?.toString() ?? "0",
				accent: "blue",
				iconName: "Users",
			},
			{
				title: "inventory.lowStock.title",
				value: lowStock.count?.toString() ?? "0",
				accent: "red",
				iconName: "AlertTriangle",
			},
		],
	};
};
