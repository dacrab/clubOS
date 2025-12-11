import { createServerClient } from "@supabase/ssr";
import type { Handle } from "@sveltejs/kit";
import { redirect } from "@sveltejs/kit";
import { env as publicEnv } from "$env/dynamic/public";

type MemberRole = "owner" | "admin" | "manager" | "staff";
type SubscriptionStatus = "trialing" | "active" | "canceled" | "past_due" | "unpaid" | "paused";

const publicRoutes = ["/", "/login", "/reset", "/auth/callback", "/logout", "/signup"];
const authOnlyRoutes = ["/onboarding", "/billing"];

const getHome = (role: MemberRole | null): string => {
	if (role === "owner" || role === "admin") return "/admin";
	if (role === "manager") return "/secretary";
	return "/staff";
};

export const handle: Handle = async ({ event, resolve }) => {
	const { PUBLIC_SUPABASE_URL: url, PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: anon } = publicEnv as { PUBLIC_SUPABASE_URL?: string; PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?: string };
	if (!(url && anon)) throw new Error("Missing PUBLIC_SUPABASE env");

	const supabase = createServerClient(url, anon, {
		cookies: {
			get: (key: string) => event.cookies.get(key),
			set: (key: string, value: string, opts?: Record<string, unknown>) => event.cookies.set(key, value, { ...opts, httpOnly: true, sameSite: "lax", secure: event.url.protocol === "https:", path: "/" }),
			remove: (key: string, opts?: Record<string, unknown>) => event.cookies.delete(key, { ...opts, path: "/" }),
		},
	});

	event.locals.supabase = supabase;
	const { data: { user } } = await supabase.auth.getUser();
	const { data: { session } } = await supabase.auth.getSession();
	event.locals.user = user ?? null;
	event.locals.session = session ?? null;

	const path = event.url.pathname;
	const isPublic = publicRoutes.includes(path) || path.startsWith("/api/");
	const isAuthOnly = authOnlyRoutes.includes(path);

	// Get membership info (role, tenant, subscription status)
	const getMembershipInfo = async (): Promise<{ 
		role: MemberRole | null; 
		tenantId: string | null; 
		facilityId: string | null;
		hasActiveSubscription: boolean;
	}> => {
		if (!user) return { role: null, tenantId: null, facilityId: null, hasActiveSubscription: false };
		
		// Get user's primary membership
		const { data: membership } = await supabase
			.from("memberships")
			.select("role, tenant_id, facility_id")
			.eq("user_id", user.id)
			.order("is_primary", { ascending: false })
			.limit(1)
			.single();
		
		if (!membership) return { role: null, tenantId: null, facilityId: null, hasActiveSubscription: false };

		// Get subscription status
		const { data: subscription } = await supabase
			.from("subscriptions")
			.select("status, current_period_end, trial_end")
			.eq("tenant_id", membership.tenant_id)
			.single();

		let hasActiveSubscription = false;
		if (subscription) {
			const activeStatuses: SubscriptionStatus[] = ["trialing", "active"];
			const isActive = activeStatuses.includes(subscription.status as SubscriptionStatus);
			const now = new Date();
			const periodEnd = subscription.current_period_end ? new Date(subscription.current_period_end) : null;
			const trialEnd = subscription.trial_end ? new Date(subscription.trial_end) : null;
			const notExpired = (periodEnd && periodEnd > now) || (trialEnd && trialEnd > now);
			hasActiveSubscription = isActive && !!notExpired;
		}

		return { 
			role: membership.role as MemberRole, 
			tenantId: membership.tenant_id, 
			facilityId: membership.facility_id,
			hasActiveSubscription 
		};
	};

	// Redirect logged-in users from login page
	if (path === "/" && user) {
		const { role } = await getMembershipInfo();
		if (role) throw redirect(307, getHome(role));
	}

	// Public routes - allow access
	if (isPublic) return resolve(event);

	// Not logged in - redirect to login
	if (!user) throw redirect(307, "/");

	// Check membership and subscription status
	const { role, tenantId, hasActiveSubscription } = await getMembershipInfo();

	// User hasn't completed onboarding
	if (!tenantId && !isAuthOnly) {
		throw redirect(307, "/onboarding");
	}

	// User completed onboarding but no active subscription
	if (tenantId && !hasActiveSubscription && !isAuthOnly) {
		throw redirect(307, "/billing");
	}

	// Auth-only routes (onboarding, billing) - allow if logged in
	if (isAuthOnly) return resolve(event);

	// Role-based access control
	const isAdminRole = role === "owner" || role === "admin";
	const isManagerRole = isAdminRole || role === "manager";
	
	if (path.startsWith("/admin") && !isAdminRole) throw redirect(307, getHome(role));
	if (path.startsWith("/secretary") && !isManagerRole) throw redirect(307, getHome(role));
	// Staff routes are accessible to all authenticated users with a membership

	return resolve(event);
};
