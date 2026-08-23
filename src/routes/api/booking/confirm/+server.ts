import { handleBookingEmail } from "$lib/server/booking-email";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, locals }) =>
	handleBookingEmail(locals.userId, request, {
		subjectPrefix: "Booking Confirmed",
		heading: "Your booking is confirmed!",
		ctaLabel: "Manage Booking",
	});
