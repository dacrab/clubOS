import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import type { BookingType } from "$lib/types/database";
import { BOOKING_TYPE } from "$lib/constants";

const VALID_TYPES: BookingType[] = [BOOKING_TYPE.BIRTHDAY, BOOKING_TYPE.FOOTBALL, "event", "other"];

export const load: PageServerLoad = async ({ locals, params, parent }) => {
	const type = params.type as BookingType;
	if (!VALID_TYPES.includes(type)) throw error(404, "Invalid booking type");

	const { supabase } = locals;
	const { user } = await parent();
	
	const { data: bookings } = await supabase
		.from("bookings")
		.select("*")
		.eq("type", type)
		.eq("facility_id", user.facilityId)
		.order("starts_at", { ascending: true });

	return { bookings: bookings ?? [], type };
};
