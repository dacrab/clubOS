import { redirect } from "@sveltejs/kit";
import type { AuthObject } from "svelte-clerk/server";
import { buildClerkProps } from "svelte-clerk/server";
import { resolveUserContext } from "$lib/server/auth";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals }) => {
	const userId = locals.userId;
	if (!userId) throw redirect(307, "/");

	const ctx = await resolveUserContext(userId);
	if (!ctx?.membership) throw redirect(307, "/onboarding");

	const authObj: AuthObject = typeof locals.auth === "function" ? locals.auth() : locals.auth;

	const sessionUser = {
		id: userId,
		fullName: ctx.profile?.fullName ?? null,
		role: ctx.membership.role,
		tenantId: ctx.membership.tenantId,
		facilityId: ctx.membership.facilityId,
	};

	return {
		...buildClerkProps(authObj),
		user: sessionUser,
		settings: ctx.tenant?.settings ?? null,
		activeSession: ctx.activeSession,
	};
};
