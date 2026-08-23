import { handleBookingEmail } from "$lib/server/booking-email";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, locals }) =>
	handleBookingEmail(locals.userId, request, {
		subjectPrefix: "Reminder",
		heading: "Your booking is coming up!",
		ctaLabel: "View & Manage",
	});
