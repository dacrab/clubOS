import { error, fail } from "@sveltejs/kit";
import { getSupabaseAdmin } from "$lib/server/supabase-admin";
import { verifyBookingToken } from "$lib/server/token";
import type { Actions, PageServerLoad } from "./$types";

function validateAccess(params: { id: string }, url: URL): void {
	const token = url.searchParams.get("token");
	if (!token || !verifyBookingToken(params.id, token)) throw error(404, "Booking not found");
}

export const load: PageServerLoad = async ({ params, url }) => {
	validateAccess(params, url);

	const admin = getSupabaseAdmin();
	const { data: booking } = await admin.from("bookings").select("*").eq("id", params.id).single();

	if (!booking) throw error(404, "Booking not found");

	return { booking };
};

export const actions: Actions = {
	cancel: async ({ params, url, request }) => {
		validateAccess(params, url);
		const fd = await request.formData();
		const reason = String(fd.get("reason") ?? "");

		const admin = getSupabaseAdmin();
		const { error: err } = await admin
			.from("bookings")
			.update({
				status: "canceled",
				notes: `Canceled by customer.${reason ? ` Reason: ${reason}` : ""}`,
				updated_at: new Date().toISOString(),
			})
			.eq("id", params.id);

		if (err) return fail(500, { message: err.message });
		return { success: true };
	},

	reschedule: async ({ params, url, request }) => {
		validateAccess(params, url);
		const fd = await request.formData();
		const message = String(fd.get("message") ?? "");

		if (!message) return fail(400, { rescheduleMessage: "Please describe your request" });

		const admin = getSupabaseAdmin();
		const { error: err } = await admin
			.from("bookings")
			.update({
				notes: `Reschedule requested: ${message}`,
				updated_at: new Date().toISOString(),
			})
			.eq("id", params.id);

		if (err) return fail(500, { rescheduleMessage: err.message });
		return { rescheduleSent: true };
	},
};
