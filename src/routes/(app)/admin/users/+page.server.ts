import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const { supabase } = locals;

	const { data: users } = await supabase
		.from("users")
		.select("*")
		.order("username");

	return {
		users: users ?? [],
	};
};
