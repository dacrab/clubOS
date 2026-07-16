import { json } from "@sveltejs/kit";
import { BookingRemindBodySchema } from "$lib/schemas";
import { sendBookingEmail } from "$lib/server/email";
import { getSupabaseAdmin } from "$lib/server/supabase-admin";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: "Unauthorized" }, { status: 401 });

	const parsed = BookingRemindBodySchema.safeParse(await request.json().catch(() => ({})));
	if (!parsed.success) return json({ error: "Missing booking id" }, { status: 400 });

	const { id } = parsed.data;

	const booking = await getSupabaseAdmin()
		.from("bookings")
		.select("status, customer_email")
		.eq("id", id)
		.single()
		.then((r) => r.data);
	if (!booking) return json({ sent: false, reason: "Booking not found" }, { status: 404 });
	if (booking.status === "canceled")
		return json({ sent: false, reason: "Unable to send reminder" });

	return sendBookingEmail(id, "Reminder", "Your booking is coming up!", "View & Manage");
};
