import { createServerClient } from "@supabase/ssr";
import { redirect, type Handle } from "@sveltejs/kit";
import { env as publicEnv } from "$env/dynamic/public";
import type { MemberRole, SubscriptionStatus } from "$lib/types/database";
import { getHomeForRole } from "$lib/config/auth";

const publicRoutes = ["/", "/reset", "/auth/callback", "/logout", "/signup"];
const authOnlyRoutes = ["/onboarding", "/billing"];

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
	event.locals.user = user;

	const path = event.url.pathname;
	const isPublic = publicRoutes.includes(path) || path.startsWith("/api/");
	const isAuthOnly = authOnlyRoutes.includes(path);

	// Fetch membership + subscription once via RPC, lazily (same as layout.server.ts)
	let _ctx: { role: MemberRole | null; tenantId: string | null; facilityId: string | null; active: boolean } | null = null;
	const getMembership = async (): Promise<{ role: MemberRole | null; tenantId: string | null; facilityId: string | null; active: boolean }> => {
		if (_ctx) return _ctx;
		if (!user) return (_ctx = { role: null, tenantId: null, facilityId: null, active: false });

		const { data: ctx } = await supabase.rpc("get_user_context", { p_user_id: user.id });
		if (!ctx?.membership) return (_ctx = { role: null, tenantId: null, facilityId: null, active: false });

		const sub = ctx.subscription;
		const now = new Date();
		const active = sub && ["trialing", "active"].includes(sub.status as SubscriptionStatus) &&
			((sub.periodEnd && new Date(sub.periodEnd) > now) || (sub.trialEnd && new Date(sub.trialEnd) > now));

		return (_ctx = { role: ctx.membership.role as MemberRole, tenantId: ctx.membership.tenantId, facilityId: ctx.membership.facilityId, active: !!active });
	};

	if (path === "/" && user) {
		const { role } = await getMembership();
		if (role) throw redirect(307, getHomeForRole(role));
	}

	if (isPublic) return resolve(event);
	if (!user) throw redirect(307, "/");

	const { role, tenantId, active } = await getMembership();

	if (!tenantId && !isAuthOnly) throw redirect(307, "/onboarding");
	if (tenantId && !active && !isAuthOnly) throw redirect(307, "/billing");
	if (isAuthOnly) return resolve(event);

	const isAdmin = role === "owner" || role === "admin";
	if (path.startsWith("/admin") && !isAdmin) throw redirect(307, getHomeForRole(role));
	if (path.startsWith("/secretary") && !(isAdmin || role === "manager")) throw redirect(307, getHomeForRole(role));

	return resolve(event);
};
