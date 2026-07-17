import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals }) => {
	const { user, userCtx } = locals;
	if (!user) throw redirect(307, "/");
	if (!userCtx?.membership) throw redirect(307, "/onboarding");

	const sessionUser = {
		id: user.id,
		email: user.email ?? "",
		username: userCtx.profile?.fullName ?? user.email ?? "",
		role: userCtx.membership.role ?? "staff",
		tenantId: userCtx.membership.tenantId,
		facilityId: userCtx.membership.facilityId,
	};

	return {
		user: sessionUser,
		settings: userCtx.tenant?.settings ?? null,
		activeSession: userCtx.activeSession,
	};
};
