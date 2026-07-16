import { error } from "@sveltejs/kit";
import { BookingTypeSchema } from "$lib/schemas";
import type { BookingType } from "$lib/types/database";
import type { PageServerLoad } from "./$types";

const PER_PAGE = 25;

export const load: PageServerLoad = async ({ locals, params, parent, url }) => {
	const parsedType = BookingTypeSchema.safeParse(params.type);
	if (!parsedType.success) throw error(404, "Invalid booking type");
	const type: BookingType = parsedType.data;

	const { supabase } = locals;
	const { user } = await parent();

	const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
	const search = url.searchParams.get("search") ?? "";
	const from = (page - 1) * PER_PAGE;
	const to = from + PER_PAGE - 1;

	const sevenDaysAgo = new Date();
	sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

	let query = supabase
		.from("bookings")
		.select("*", { count: "exact" })
		.eq("type", type)
		.eq("facility_id", user.facilityId)
		.gte("starts_at", sevenDaysAgo.toISOString())
		.order("starts_at", { ascending: true });

	if (search) query = query.ilike("customer_name", `%${search}%`);

	const { data: bookings, count } = await query.range(from, to);

	return {
		bookings: bookings ?? [],
		type,
		page,
		totalPages: Math.ceil((count ?? 0) / PER_PAGE),
		search,
	};
};
