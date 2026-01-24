import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { supabase } = locals;
	const { user } = await parent();

	const { data } = await supabase.rpc("get_booking_stats", { p_facility_id: user.facilityId });

	return {
		upcomingBirthdays: data?.upcomingBirthdays ?? 0,
		upcomingFootball: data?.upcomingFootball ?? 0,
		thisMonthTotal: data?.thisMonthTotal ?? 0,
	};
};
