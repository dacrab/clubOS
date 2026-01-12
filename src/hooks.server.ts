import { createServerClient } from "@supabase/ssr";
import { redirect, type Handle } from "@sveltejs/kit";
import { env as publicEnv } from "$env/dynamic/public";
import type { MemberRole, SubscriptionStatus } from "$lib/types/database";

const publicRoutes = ["/", "/login", "/reset", "/auth/callback", "/logout", "/signup"];
const authOnlyRoutes = ["/onboarding", "/billing"];

const getHome = (role: MemberRole | null): string =>
	role === "owner" || role === "admin" ? "/admin" : role === "manager" ? "/secretary" : "/staff";

export const handle: Handle = async ({ event, resolve }) => {
	const { PUBLIC_SUPABASE_URL: url, PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: anon } = publicEnv;
	if (!(url && anon)) throw new Error("Missing PUBLIC_SUPABASE env");

	const supabase = createServerClient(url, anon, {
		cookies: {
			get: (key) => event.cookies.get(key),
			set: (key, value, opts) => event.cookies.set(key, value, { ...opts, httpOnly: true, sameSite: "lax", secure: event.url.protocol === "https:", path: "/" }),
			remove: (key, opts) => event.cookies.delete(key, { ...opts, path: "/" }),
		},
	});

	event.locals.supabase = supabase;
	const { data: { user } } = await supabase.auth.getUser();
	const { data: { session } } = await supabase.auth.getSession();
	event.locals.user = user;
	event.locals.session = session;

	if (session?.expires_at && new Date(session.expires_at * 1000) < new Date()) {
		throw redirect(307, "/login");
	}

	const path = event.url.pathname;
	const isPublic = publicRoutes.includes(path) || path.startsWith("/api/");
	const isAuthOnly = authOnlyRoutes.includes(path);

	const getMembership = async (): Promise<{ role: MemberRole | null; tenantId: string | null; facilityId: string | null; active: boolean }> => {
		if (!user) return { role: null as MemberRole | null, tenantId: null as string | null, facilityId: null as string | null, active: false };
		
		const { data: m } = await supabase.from("memberships").select("role, tenant_id, facility_id").eq("user_id", user.id).order("is_primary", { ascending: false }).limit(1).single();
		if (!m) return { role: null, tenantId: null, facilityId: null, active: false };

		const { data: s } = await supabase.from("subscriptions").select("status, current_period_end, trial_end").eq("tenant_id", m.tenant_id).single();
		const now = Date.now();
		const active = s && ["trialing", "active"].includes(s.status as SubscriptionStatus) && 
			((s.current_period_end && new Date(s.current_period_end).getTime() > now) || (s.trial_end && new Date(s.trial_end).getTime() > now));

		return { role: m.role as MemberRole, tenantId: m.tenant_id, facilityId: m.facility_id, active: !!active };
	};

	if (path === "/" && user) {
		const { role } = await getMembership();
		if (role) throw redirect(307, getHome(role));
	}

	if (isPublic) return resolve(event);
	if (!user) throw redirect(307, "/");

	const { role, tenantId, active } = await getMembership();

	if (!tenantId && !isAuthOnly) throw redirect(307, "/onboarding");
	if (tenantId && !active && !isAuthOnly) throw redirect(307, "/billing");
	if (isAuthOnly) return resolve(event);

	const isAdmin = role === "owner" || role === "admin";
	if (path.startsWith("/admin") && !isAdmin) throw redirect(307, getHome(role));
	if (path.startsWith("/secretary") && !(isAdmin || role === "manager")) throw redirect(307, getHome(role));

	return resolve(event);
};
