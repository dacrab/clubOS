import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const { supabase } = locals;

	const now = new Date();
	const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

	const { count: upcomingBirthdays } = await supabase
		.from("bookings")
		.select("id", { count: "exact", head: true })
		.eq("type", "birthday")
		.gte("starts_at", now.toISOString())
		.eq("status", "confirmed");

	const { count: upcomingFootball } = await supabase
		.from("bookings")
		.select("id", { count: "exact", head: true })
		.eq("type", "football")
		.gte("starts_at", now.toISOString())
		.eq("status", "confirmed");

	const { count: thisMonthTotal } = await supabase
		.from("bookings")
		.select("id", { count: "exact", head: true })
		.gte("starts_at", startOfMonth.toISOString());

	return {
		upcomingBirthdays: upcomingBirthdays ?? 0,
		upcomingFootball: upcomingFootball ?? 0,
		thisMonthTotal: thisMonthTotal ?? 0,
	};
};
