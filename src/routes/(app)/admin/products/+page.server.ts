import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { user, products, categories } = await parent();
	const { supabase } = locals;

	const { data: lowStockProducts } = await supabase
		.from("v_low_stock_products")
		.select("*")
		.eq("facility_id", user.facilityId);

	return { products, categories, lowStockProducts: lowStockProducts ?? [] };
};