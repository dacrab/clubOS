import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";
import type { SessionUser } from "$lib/state/session.svelte";

export const load: LayoutServerLoad = async ({ locals }) => {
	const { user, supabase } = locals;

	if (!user) {
		throw redirect(307, "/");
	}

	// Single RPC call for user context (membership, profile, tenant, subscription, activeSession)
	const { data: ctx } = await supabase.rpc("get_user_context", { p_user_id: user.id });

	if (!ctx?.membership) {
		throw redirect(307, "/onboarding");
	}

	// Check subscription
	const sub = ctx.subscription;
	const now = new Date();
	const isActive = sub && 
		["trialing", "active"].includes(sub.status) &&
		((sub.periodEnd && new Date(sub.periodEnd) > now) ||
		 (sub.trialEnd && new Date(sub.trialEnd) > now));

	if (!isActive) throw redirect(307, "/billing");

	const sessionUser: SessionUser = {
		id: user.id,
		email: user.email ?? "",
		username: ctx.profile?.fullName ?? user.email ?? "",
		role: ctx.membership.role as SessionUser["role"],
		tenantId: ctx.membership.tenantId,
		facilityId: ctx.membership.facilityId,
	};

	// Fetch products and categories (still needed for forms)
	const [{ data: products }, { data: categories }] = await Promise.all([
		supabase.from("products").select("*").eq("facility_id", ctx.membership.facilityId).order("name"),
		supabase.from("categories").select("id, name, parent_id, description").eq("facility_id", ctx.membership.facilityId),
	]);

	return {
		user: sessionUser,
		settings: ctx.tenant?.settings ?? null,
		subscription: sub ? { status: sub.status, planName: sub.planName, periodEnd: sub.periodEnd, trialEnd: sub.trialEnd } : null,
		products: products ?? [],
		categories: categories ?? [],
		activeSession: ctx.activeSession,
	};
};
