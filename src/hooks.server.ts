import { createServerClient } from "@supabase/ssr";
import { type Handle, redirect } from "@sveltejs/kit";
import { env as publicEnv } from "$env/dynamic/public";
import { getHomeForRole } from "$lib/config/auth";
import type { MemberRole } from "$lib/types/database";

const PUBLIC_ROUTES = ["/", "/reset", "/auth/callback", "/logout", "/signup"];
const AUTH_ONLY_ROUTES = ["/onboarding", "/billing"];

type Ctx = {
	role: MemberRole | null;
	tenantId: string | null;
	facilityId: string | null;
	active: boolean;
};
const EMPTY_CTX: Ctx = { role: null, tenantId: null, facilityId: null, active: false };

const isActive = (
	sub: { status?: string; periodEnd?: string | null; trialEnd?: string | null } | null,
): boolean => {
	if (!sub || (sub.status !== "trialing" && sub.status !== "active")) return false;
	const now = Date.now();
	return (
		(!!sub.periodEnd && new Date(sub.periodEnd).getTime() > now) ||
		(!!sub.trialEnd && new Date(sub.trialEnd).getTime() > now)
	);
};

export const handle: Handle = async ({ event, resolve }) => {
	const { PUBLIC_SUPABASE_URL: url, PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: anon } = publicEnv;
	if (!(url && anon)) throw new Error("Missing PUBLIC_SUPABASE env");

	const supabase = createServerClient(url, anon, {
		cookies: {
			get: (key) => event.cookies.get(key),
			set: (key, value, opts) =>
				event.cookies.set(key, value, {
					...opts,
					httpOnly: true,
					sameSite: "lax",
					secure: event.url.protocol === "https:",
					path: "/",
				}),
			remove: (key, opts) => event.cookies.delete(key, { ...opts, path: "/" }),
		},
	});

	event.locals.supabase = supabase;
	const {
		data: { user },
	} = await supabase.auth.getUser();
	event.locals.user = user;

	const path = event.url.pathname;
	const isPublic = PUBLIC_ROUTES.includes(path) || path.startsWith("/api/");
	const isAuthOnly = AUTH_ONLY_ROUTES.includes(path);

	let cached: Ctx | undefined;
	const getCtx = async (): Promise<Ctx> => {
		if (cached) return cached;
		if (!user) {
			cached = EMPTY_CTX;
			return cached;
		}
		const { data: ctx } = await supabase.rpc("get_user_context", { p_user_id: user.id });
		if (!ctx?.membership) {
			cached = EMPTY_CTX;
			return cached;
		}
		cached = {
			role: ctx.membership.role,
			tenantId: ctx.membership.tenantId,
			facilityId: ctx.membership.facilityId,
			active: isActive(ctx.subscription),
		};
		return cached;
	};

	if (path === "/" && user) {
		const { role } = await getCtx();
		if (role) throw redirect(307, getHomeForRole(role));
	}

	if (isPublic) return resolve(event);
	if (!user) throw redirect(307, "/");

	const { role, tenantId, active } = await getCtx();

	if (!tenantId && !isAuthOnly) throw redirect(307, "/onboarding");
	if (tenantId && !active && !isAuthOnly) throw redirect(307, "/billing");
	if (isAuthOnly) return resolve(event);

	const isAdmin = role === "owner" || role === "admin";
	if (path.startsWith("/admin") && !isAdmin) throw redirect(307, getHomeForRole(role));
	if (path.startsWith("/secretary") && !(isAdmin || role === "manager"))
		throw redirect(307, getHomeForRole(role));

	return resolve(event);
};
