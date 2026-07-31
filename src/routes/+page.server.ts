import { redirect } from "@sveltejs/kit";
import { getHomeForRole } from "$lib/config/auth";
import { resolveUserContext } from "$lib/server/auth";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.userId;
	if (!userId) return {};

	const ctx = await resolveUserContext(userId);
	if (!ctx?.membership) throw redirect(307, "/onboarding");
	throw redirect(307, getHomeForRole(ctx.membership.role));
};
