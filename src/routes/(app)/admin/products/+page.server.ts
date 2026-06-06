import type { CategoryPartial } from "$lib/types/database";
import type { PageServerLoad } from "./$types";

const PER_PAGE = 25;

export const load: PageServerLoad = async ({ locals, parent, url }) => {
	const { user } = await parent();
	const { supabase } = locals;

	const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
	const from = (page - 1) * PER_PAGE;
	const to = from + PER_PAGE - 1;

	const { data: lowStockProducts } = await supabase
		.from("v_low_stock_products")
		.select("*")
		.eq("facility_id", user.facilityId);

	const { data: categories } = await supabase
		.from("categories")
		.select("id, name, parent_id, description")
		.eq("facility_id", user.facilityId)
		.order("name");

	const search = url.searchParams.get("search");

	let query = supabase
		.from("products")
		.select("*", { count: "exact" })
		.eq("facility_id", user.facilityId);

	if (search) {
		query = query.ilike("name", `%${search}%`);
	}

	const { data: paginatedProducts, count } = await query.order("name").range(from, to);

	return {
		lowStockProducts: lowStockProducts ?? [],
		paginatedProducts: paginatedProducts ?? [],
		categories: (categories ?? []) as CategoryPartial[],
		page,
		totalPages: Math.ceil((count ?? 0) / PER_PAGE),
	};
};
