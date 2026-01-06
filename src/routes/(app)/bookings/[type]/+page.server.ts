import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import type { BookingType } from "$lib/types/database";

const VALID_TYPES: BookingType[] = ["birthday", "football", "event", "other"];

export const load: PageServerLoad = async ({ locals, params }) => {
	const type = params.type as BookingType;
	if (!VALID_TYPES.includes(type)) throw error(404, "Invalid booking type");

	const { supabase } = locals;
	const { data: bookings } = await supabase
		.from("bookings")
		.select("*")
		.eq("type", type)
		.order("starts_at", { ascending: true });

	return { bookings: bookings ?? [], type };
};
