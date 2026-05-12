import type { PageServerLoad } from "./$types";

const PER_PAGE = 25;

export const load: PageServerLoad = async ({ locals, parent, url }) => {
	const { user } = await parent();
	const { supabase } = locals;

	const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
	const search = url.searchParams.get("search") ?? "";
	const from = (page - 1) * PER_PAGE;
	const to = from + PER_PAGE - 1;

	let query = supabase
		.from("v_orders_list")
		.select("*", { count: "exact" })
		.eq("facility_id", user.facilityId)
		.order("created_at", { ascending: false });

	if (search) query = query.ilike("id", `${search}%`);

	const { data: orders, count } = await query.range(from, to);

	return { orders: orders ?? [], page, totalPages: Math.ceil((count ?? 0) / PER_PAGE), search };
};
