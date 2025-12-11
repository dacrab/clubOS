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
		// User has no membership - redirect to onboarding
		throw redirect(307, "/onboarding");
	}

	// Get user profile
	const { data: profile } = await supabase
		.from("users")
		.select("full_name, avatar_url")
		.eq("id", user.id)
		.single();

	// Get subscription status
	const { data: subscription } = await supabase
		.from("subscriptions")
		.select("status, plan_name, current_period_end, trial_end")
		.eq("tenant_id", membership.tenant_id)
		.single();

	// Check if subscription is active
	const now = new Date();
	const isSubscriptionActive = subscription && 
		["trialing", "active"].includes(subscription.status) &&
		(
			(subscription.current_period_end && new Date(subscription.current_period_end) > now) ||
			(subscription.trial_end && new Date(subscription.trial_end) > now)
		);

	if (!isSubscriptionActive) {
		throw redirect(307, "/billing");
	}

	// Build session user object
	const sessionUser: SessionUser = {
		id: user.id,
		email: user.email ?? "",
		username: profile?.full_name ?? user.email ?? "",
		role: membership.role as SessionUser["role"],
		tenantId: membership.tenant_id,
		facilityId: membership.facility_id,
	};

	// Get tenant settings (from JSONB column)
	// Supabase returns single related records as objects, not arrays, when using .single()
	const tenant = membership.tenants as unknown as { id: string; name: string; slug: string; settings: Record<string, unknown> | null } | null;
	const tenantSettings = tenant?.settings ?? null;

	return {
		user: sessionUser,
		settings: tenantSettings,
		subscription: subscription ? {
			status: subscription.status,
			planName: subscription.plan_name,
			periodEnd: subscription.current_period_end,
			trialEnd: subscription.trial_end,
		} : null,
	};
};
