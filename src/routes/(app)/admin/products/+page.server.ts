import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { user } = await parent();
	const { supabase } = locals;

	const [{ data: products }, { data: categories }, { data: lowStockProducts }] = await Promise.all([
		supabase.from("products").select("*").eq("facility_id", user.facilityId).order("name"),
		supabase.from("categories").select("*").eq("facility_id", user.facilityId).order("name"),
		supabase.from("v_low_stock_products").select("*").eq("facility_id", user.facilityId),
	]);

	return { products: products ?? [], categories: categories ?? [], lowStockProducts: lowStockProducts ?? [] };
};