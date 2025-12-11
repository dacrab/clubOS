import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const { user, supabase } = locals;

	// Not logged in - show login page
	if (!user) {
		return {};
	}

	// Get user's membership to determine redirect
	const { data: membership } = await supabase
		.from("memberships")
		.select("role")
		.eq("user_id", user.id)
		.order("is_primary", { ascending: false })
		.limit(1)
		.single();

	if (!membership) {
		// No membership - redirect to onboarding
		throw redirect(307, "/onboarding");
	}

	// Redirect based on role
	const role = membership.role as string;
	
	switch (role) {
		case "owner":
		case "admin":
			throw redirect(307, "/admin");
		case "manager":
			throw redirect(307, "/secretary");
		case "staff":
		default:
			throw redirect(307, "/staff");
	}
};
