import { error, json } from "@sveltejs/kit";
import { sendBookingEmail } from "$lib/server/email";
import { getSupabaseAdmin } from "$lib/server/supabase-admin";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request }) => {
	const { id } = (await request.json()) as { id?: string };
	if (!id) throw error(400, "Missing booking id");

	const booking = await getSupabaseAdmin()
		.from("bookings")
		.select("status, customer_email")
		.eq("id", id)
		.single()
		.then((r) => r.data);
	if (!booking) throw error(404, "Booking not found");
	if (booking.status === "canceled") return json({ sent: false, reason: "Booking canceled" });

	return sendBookingEmail(id, "Reminder", "Your booking is coming up!", "View & Manage");
};
