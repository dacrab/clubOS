import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getHomeForRole } from "$lib/config/auth";

export const load: PageServerLoad = async ({ locals }) => {
	const { user, supabase } = locals;

	if (!user) return {};

	const { data: membership } = await supabase
		.from("memberships")
		.select("role")
		.eq("user_id", user.id)
		.order("is_primary", { ascending: false })
		.limit(1)
		.single();

	if (!membership) throw redirect(307, "/onboarding");
	throw redirect(307, getHomeForRole(membership.role));
};
