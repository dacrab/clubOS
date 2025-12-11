import { loadBookings } from "$lib/server/bookings";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => loadBookings(locals.supabase, "birthday");
