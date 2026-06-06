import { redirect } from "@sveltejs/kit";
import type { SessionUser } from "$lib/types/database";
import type { LayoutServerLoad } from "./$types";

// Auth + subscription gating happens in hooks.server.ts. By the time we reach here,
// the user is authenticated and has an active tenant + subscription.
export const load: LayoutServerLoad = async ({ locals }) => {
	const { user, supabase } = locals;
	if (!user) throw redirect(307, "/");

	const { data: ctx } = await supabase.rpc("get_user_context", { p_user_id: user.id });
	if (!ctx?.membership) throw redirect(307, "/onboarding");

	const sessionUser: SessionUser = {
		id: user.id,
		email: user.email ?? "",
		username: ctx.profile?.fullName ?? user.email ?? "",
		role: ctx.membership.role as SessionUser["role"],
		tenantId: ctx.membership.tenantId,
		facilityId: ctx.membership.facilityId,
	};

	return {
		user: sessionUser,
		settings: ctx.tenant?.settings ?? null,
		activeSession: ctx.activeSession,
	};
};
