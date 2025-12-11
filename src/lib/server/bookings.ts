import type { SupabaseClient } from "@supabase/supabase-js";
import type { Booking, BookingType } from "$lib/types/database";

export async function loadBookings(supabase: SupabaseClient, type: BookingType): Promise<{ bookings: Booking[] }> {
	const { data: bookings } = await supabase
		.from("bookings")
		.select("*")
		.eq("type", type)
		.order("starts_at", { ascending: true });

	return { bookings: bookings ?? [] };
}
