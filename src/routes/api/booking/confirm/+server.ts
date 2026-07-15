import { error } from "@sveltejs/kit";
import { sendBookingEmail } from "$lib/server/email";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request }) => {
	const id: string | undefined = (await request.json()).id;
	if (!id) throw error(400, "Missing booking id");

	return sendBookingEmail(id, "Booking Confirmed", "Your booking is confirmed!", "Manage Booking");
};
