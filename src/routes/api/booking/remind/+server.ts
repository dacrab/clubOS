import { error, json } from "@sveltejs/kit";
import {
	buildBookingEmailHtml,
	buildBookingEmailLines,
	canSendEmail,
	sendEmail,
} from "$lib/server/email";
import { getSupabaseAdmin } from "$lib/server/supabase-admin";
import { generateBookingToken } from "$lib/server/token";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request }) => {
	const { id } = (await request.json()) as { id?: string };
	if (!id) throw error(400, "Missing booking id");

	if (!canSendEmail()) {
		return json({ sent: false, reason: "RESEND_API_KEY not configured" });
	}

	const admin = getSupabaseAdmin();
	const { data: booking } = await admin.from("bookings").select("*").eq("id", id).single();
	if (!booking) throw error(404, "Booking not found");
	if (booking.status === "canceled") return json({ sent: false, reason: "Booking canceled" });
	if (!booking.customer_email) return json({ sent: false, reason: "No customer email" });

	const origin = new URL(request.url).origin;
	const manageUrl = `${origin}/booking/${booking.id}/manage?token=${generateBookingToken(booking.id)}`;

	await sendEmail(
		booking.customer_email,
		`Reminder — ${booking.customer_name}`,
		buildBookingEmailHtml(
			"Your booking is coming up!",
			buildBookingEmailLines(booking),
			manageUrl,
			"View & Manage",
		),
	);

	return json({ sent: true });
};
