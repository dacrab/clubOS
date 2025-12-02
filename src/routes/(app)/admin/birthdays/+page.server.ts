import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const { supabase } = locals;

	const { data: appointments } = await supabase
		.from("appointments")
		.select("*")
		.order("appointment_date", { ascending: true });

	return {
		appointments: appointments ?? [],
	};
};
