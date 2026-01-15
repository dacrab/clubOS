import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { user } = await parent();
	const { supabase } = locals;

	const [{ data: products }, { data: categories }] = await Promise.all([
		supabase.from("products").select("*").eq("facility_id", user.facilityId).order("name"),
		supabase.from("categories").select("*").eq("facility_id", user.facilityId).order("name"),
	]);

	// Get low stock products
	const lowStockProducts = products?.filter(p => p.stock_quantity >= 0 && p.stock_quantity <= 5) ?? [];

	return { products: products ?? [], categories: categories ?? [], lowStockProducts };
};