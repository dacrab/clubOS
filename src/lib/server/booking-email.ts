import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { BookingConfirmBodySchema } from "$lib/schemas";
import { getVerifiedBooking } from "$lib/server/booking-ownership";
import { sendBookingEmail } from "$lib/server/email";

export async function handleBookingEmail(
	userId: string | null,
	request: Request,
	email: { subjectPrefix: string; heading: string; ctaLabel: string },
): Promise<Response> {
	if (!userId) return json({ error: "Unauthorized" }, { status: 401 });

	const parsed = BookingConfirmBodySchema.safeParse(await request.json().catch(() => ({})));
	if (!parsed.success) return json({ error: "Missing booking id" }, { status: 400 });

	const verified = await getVerifiedBooking(userId, parsed.data.id);
	if (!verified) return json({ sent: false, reason: "Booking not found" }, { status: 403 });
	if (verified.booking.status === "canceled")
		return json({ sent: false, reason: "Unable to send notification" });

	// Configured ORIGIN wins; otherwise the request URL (never raw headers).
	const origin = env.ORIGIN ?? new URL(request.url).origin;
	return sendBookingEmail(
		parsed.data.id,
		origin,
		email.subjectPrefix,
		email.heading,
		email.ctaLabel,
	);
}
