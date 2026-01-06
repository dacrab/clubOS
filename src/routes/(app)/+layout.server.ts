import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";
import type { SessionUser } from "$lib/state/session.svelte";

export const load: LayoutServerLoad = async ({ locals }) => {
	const { user, supabase } = locals;

	if (!user) {
		throw redirect(307, "/");
	}

	// Get user's primary membership with tenant info
	const { data: membership } = await supabase
		.from("memberships")
		.select(`
			role,
			tenant_id,
			facility_id,
			is_primary,
			tenants (
				id,
				name,
				slug,
				settings
			)
		`)
		.eq("user_id", user.id)
		.order("is_primary", { ascending: false })
		.limit(1)
		.single();

	if (!membership) {
		throw redirect(307, "/onboarding");
	}

	// Get user profile and subscription in parallel
	const [{ data: profile }, { data: subscription }] = await Promise.all([
		supabase.from("users").select("full_name, avatar_url").eq("id", user.id).single(),
		supabase.from("subscriptions").select("status, plan_name, current_period_end, trial_end").eq("tenant_id", membership.tenant_id).single(),
	]);

	// Check subscription
	const now = new Date();
	const isActive = subscription && 
		["trialing", "active"].includes(subscription.status) &&
		((subscription.current_period_end && new Date(subscription.current_period_end) > now) ||
		 (subscription.trial_end && new Date(subscription.trial_end) > now));

	if (!isActive) throw redirect(307, "/billing");

	const sessionUser: SessionUser = {
		id: user.id,
		email: user.email ?? "",
		username: profile?.full_name ?? user.email ?? "",
		role: membership.role as SessionUser["role"],
		tenantId: membership.tenant_id,
		facilityId: membership.facility_id,
	};

	const tenant = membership.tenants as unknown as { id: string; name: string; slug: string; settings: Record<string, unknown> | null } | null;

	// Fetch common data used across multiple pages
	const [{ data: products }, { data: categories }, { data: activeSession }] = await Promise.all([
		supabase.from("products").select("*").eq("facility_id", membership.facility_id).order("name"),
		supabase.from("categories").select("id, name, parent_id, description").eq("facility_id", membership.facility_id),
		supabase.from("register_sessions").select("*").eq("facility_id", membership.facility_id).is("closed_at", null).order("opened_at", { ascending: false }).limit(1).maybeSingle(),
	]);

	return {
		user: sessionUser,
		settings: tenant?.settings ?? null,
		subscription: subscription ? { status: subscription.status, planName: subscription.plan_name, periodEnd: subscription.current_period_end, trialEnd: subscription.trial_end } : null,
		products: products ?? [],
		categories: categories ?? [],
		activeSession,
	};
};
