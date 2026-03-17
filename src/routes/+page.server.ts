import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getHomeForRole } from "$lib/config/auth";

export const load: PageServerLoad = async ({ locals }) => {
	const { user, supabase } = locals;
	if (!user) return {};

	// Hooks already redirects authenticated users away from / — this is a safety net
	const { data: ctx } = await supabase.rpc("get_user_context", { p_user_id: user.id });
	if (!ctx?.membership) throw redirect(307, "/onboarding");
	throw redirect(307, getHomeForRole(ctx.membership.role as Parameters<typeof getHomeForRole>[0]));
};
