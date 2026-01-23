import type { PageServerLoad } from "./$types";
import { BOOKING_TYPE, BOOKING_STATUS } from "$lib/constants";

export const load: PageServerLoad = async ({ locals }) => {
	const { supabase } = locals;

	const now = new Date();
	const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
	const nowISO = now.toISOString();

	const [{ count: upcomingBirthdays }, { count: upcomingFootball }, { count: thisMonthTotal }] =
		await Promise.all([
			supabase
				.from("bookings")
				.select("id", { count: "exact", head: true })
				.eq("type", BOOKING_TYPE.BIRTHDAY)
				.gte("starts_at", nowISO)
				.eq("status", BOOKING_STATUS.CONFIRMED),
			supabase
				.from("bookings")
				.select("id", { count: "exact", head: true })
				.eq("type", BOOKING_TYPE.FOOTBALL)
				.gte("starts_at", nowISO)
				.eq("status", BOOKING_STATUS.CONFIRMED),
			supabase
				.from("bookings")
				.select("id", { count: "exact", head: true })
				.gte("starts_at", startOfMonth.toISOString()),
		]);

	return {
		upcomingBirthdays: upcomingBirthdays ?? 0,
		upcomingFootball: upcomingFootball ?? 0,
		thisMonthTotal: thisMonthTotal ?? 0,
	};
};
