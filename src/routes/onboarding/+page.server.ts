import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, url }) => {
	const { user, supabase } = locals;

	if (!user) {
		throw redirect(307, "/signup");
	}

	// Check if user already has a membership
	const { data: membership } = await supabase
		.from("memberships")
		.select("tenant_id, role")
		.eq("user_id", user.id)
		.order("is_primary", { ascending: false })
		.limit(1)
		.single();

	// If user already has a tenant, redirect to appropriate dashboard
	if (membership?.tenant_id) {
		const role = membership.role;
		
		switch (role) {
			case "owner":
			case "admin":
				throw redirect(307, "/admin");
			case "manager":
				throw redirect(307, "/secretary");
			default:
				throw redirect(307, "/staff");
		}
	}

	return {
		user: {
			id: user.id,
			email: user.email ?? "",
			fullName: user.user_metadata?.full_name ?? "",
		},
		sessionId: url.searchParams.get("session_id"),
	};
};
