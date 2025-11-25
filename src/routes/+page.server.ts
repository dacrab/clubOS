import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (user) {
		// Check role and redirect
		const { data: profile } = await supabase
			.from("users")
			.select("role")
			.eq("id", user.id)
			.maybeSingle();

		const role = profile?.role;
		if (role === "secretary") throw redirect(303, "/secretary");
		if (role === "staff") throw redirect(303, "/staff");
		throw redirect(303, "/admin");
	}

	throw redirect(303, "/login");
};
