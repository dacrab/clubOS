import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";
import type { SessionUser } from "$lib/types/database";
import { PRODUCTS_LIMIT, CATEGORIES_LIMIT } from "$lib/types/database";

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

	const [{ data: products }, { data: categories }] = await Promise.all([
		supabase.from("products").select("*").eq("facility_id", ctx.membership.facilityId).order("name").limit(PRODUCTS_LIMIT),
		supabase.from("categories").select("id, name, parent_id, description").eq("facility_id", ctx.membership.facilityId).order("name").limit(CATEGORIES_LIMIT),
	]);

	return {
		user: sessionUser,
		settings: ctx.tenant?.settings ?? null,
		products: products ?? [],
		categories: categories ?? [],
		activeSession: ctx.activeSession,
	};
};
