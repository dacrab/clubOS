import { redirect } from "@sveltejs/kit";
import { getHomeForRole } from "$lib/config/auth";
import type { MemberRole } from "$lib/types/database";
import type { PageServerLoad } from "./$types";

const VALID_ROLES: readonly MemberRole[] = ["owner", "admin", "manager", "staff"];

export const load: PageServerLoad = async ({ locals }) => {
	const { user, supabase } = locals;
	if (!user) return {};

	const { data: ctx } = await supabase.rpc("get_user_context", { p_user_id: user.id });
	if (!ctx?.membership) throw redirect(307, "/onboarding");
	const role = VALID_ROLES.includes(ctx.membership.role) ? ctx.membership.role : "staff";
	throw redirect(307, getHomeForRole(role));
};
