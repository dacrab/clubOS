import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	// If user is already logged in, redirect to appropriate dashboard
	if (locals.user) {
		const role = locals.user.user_metadata?.role as string | undefined;
		
		if (role === "admin") throw redirect(307, "/admin");
		if (role === "secretary") throw redirect(307, "/secretary");
		if (role === "staff") throw redirect(307, "/staff");
		
		// Fallback: check database
		const { data } = await locals.supabase
			.from("users")
			.select("role")
			.eq("id", locals.user.id)
			.single();
		
		const dbRole = data?.role as string | undefined;
		if (dbRole === "admin") throw redirect(307, "/admin");
		if (dbRole === "secretary") throw redirect(307, "/secretary");
		if (dbRole === "staff") throw redirect(307, "/staff");
	}

	return {};
};
