import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getHomeForRole } from "$lib/config/auth";

export const load: PageServerLoad = async ({ locals, url }) => {
	const { user, supabase } = locals;

	if (!user) throw redirect(307, "/signup");

	const { data: membership } = await supabase
		.from("memberships")
		.select("tenant_id, role")
		.eq("user_id", user.id)
		.order("is_primary", { ascending: false })
		.limit(1)
		.single();

	if (membership?.tenant_id) throw redirect(307, getHomeForRole(membership.role));

	return {
		user: { id: user.id, email: user.email ?? "", fullName: user.user_metadata?.full_name ?? "" },
		sessionId: url.searchParams.get("session_id"),
	};
};
