import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const { supabase } = locals;

	const now = new Date();
	const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

	const { count: upcomingAppointments } = await supabase
		.from("appointments")
		.select("id", { count: "exact", head: true })
		.gte("appointment_date", now.toISOString())
		.eq("status", "confirmed");

	const { count: upcomingBookings } = await supabase
		.from("football_bookings")
		.select("id", { count: "exact", head: true })
		.gte("booking_datetime", now.toISOString())
		.eq("status", "confirmed");

	const { count: appointmentsThisMonth } = await supabase
		.from("appointments")
		.select("id", { count: "exact", head: true })
		.gte("appointment_date", startOfMonth.toISOString());

	const { count: bookingsThisMonth } = await supabase
		.from("football_bookings")
		.select("id", { count: "exact", head: true })
		.gte("booking_datetime", startOfMonth.toISOString());

	return {
		upcomingAppointments: upcomingAppointments ?? 0,
		upcomingBookings: upcomingBookings ?? 0,
		thisMonthTotal: (appointmentsThisMonth ?? 0) + (bookingsThisMonth ?? 0),
	};
};
