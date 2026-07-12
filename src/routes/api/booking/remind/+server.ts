import { error, json } from "@sveltejs/kit";
import { buildBookingEmailHtml, canSendEmail, sendEmail } from "$lib/server/email";
import { getSupabaseAdmin } from "$lib/server/supabase-admin";
import { generateBookingToken } from "$lib/server/token";
import type { RequestHandler } from "./$types";

/**
 * POST /api/booking/remind
 * Body: { id: string }
 *
 * For automated reminders, set up a cron job (cron-job.org, GitHub Actions, etc.)
 * to call this endpoint with a CRON_SECRET Bearer token.
 */
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
	const lines = [
		`Customer: ${booking.customer_name}`,
		`Phone: ${booking.customer_phone ?? "—"}`,
		`Date: ${new Date(booking.starts_at).toLocaleString("en-GB", { timeZone: "Europe/Athens" })}`,
		`Type: ${booking.type}`,
		booking.notes ? `Notes: ${booking.notes}` : null,
	].filter(Boolean) as string[];

	await sendEmail(
		booking.customer_email,
		`Reminder — ${booking.customer_name}`,
		buildBookingEmailHtml("Your booking is coming up!", lines, manageUrl, "View & Manage"),
	);

	return json({ sent: true });
};
