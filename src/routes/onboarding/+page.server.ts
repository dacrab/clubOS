import { redirect } from "@sveltejs/kit";
import { clerkClient } from "svelte-clerk/server";
import { getHomeForRole } from "$lib/config/auth";
import { resolveUserContext } from "$lib/server/auth";
import { fetchPlans } from "$lib/server/plans";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, url }) => {
	const userId = locals.userId;
	if (!userId) throw redirect(307, "/signup");

	const ctx = await resolveUserContext(userId);
	if (ctx.membership?.tenantId) throw redirect(307, getHomeForRole(ctx.membership.role));

	const client = clerkClient;
	const clerkUser = await client.users.getUser(userId);

	const plans = fetchPlans();

	return {
		user: {
			id: userId,
			email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
			fullName: clerkUser.fullName ?? "",
		},
		sessionId: url.searchParams.get("session_id"),
		plans,
	};
};
