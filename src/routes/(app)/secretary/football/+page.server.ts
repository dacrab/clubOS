import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const { supabase } = locals;

	const { data: bookings } = await supabase
		.from("football_bookings")
		.select("*")
		.order("booking_datetime", { ascending: true });

	return {
		bookings: bookings ?? [],
	};
};
