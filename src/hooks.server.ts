import { handleErrorWithSentry, sentryHandle } from "@sentry/sveltekit";
import { createServerClient } from "@supabase/ssr";
import { type Handle, type HandleServerError, redirect } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import { env as publicEnv } from "$env/dynamic/public";
import { getHomeForRole } from "$lib/config/auth";

const enableSentry = typeof process !== "undefined" && !process.env.VITEST;

const PUBLIC_ROUTES = ["/", "/reset", "/auth/callback", "/logout", "/signup"];
const AUTH_ONLY_ROUTES = ["/onboarding", "/billing"];

const EMPTY_CTX: App.UserContext = {
	membership: null,
	profile: null,
	tenant: null,
	subscription: null,
	activeSession: null,
};

interface SubscriptionLike {
	status: string;
	periodEnd?: string;
	trialEnd?: string;
}

const isActive = (sub: unknown): boolean => {
	if (!sub || typeof sub !== "object") return false;
	const s = sub as SubscriptionLike;
	const status = s.status;
	if (typeof status !== "string" || (status !== "trialing" && status !== "active")) return false;
	const now = Date.now();
	const periodEnd = s.periodEnd;
	const trialEnd = s.trialEnd;
	return (
		(typeof periodEnd === "string" && new Date(periodEnd).getTime() > now) ||
		(typeof trialEnd === "string" && new Date(trialEnd).getTime() > now)
	);
};

const authHandle: Handle = async ({ event, resolve }) => {
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

	let cached: App.UserContext | undefined;
	const getCtx = async (): Promise<App.UserContext> => {
		if (cached) return cached;
		if (!user) {
			cached = EMPTY_CTX;
			return cached;
		}
		const { data: ctx } = await supabase.rpc("get_user_context", { p_user_id: user.id });
		cached = ctx?.membership
			? {
					membership: {
						role: ctx.membership.role,
						tenantId: ctx.membership.tenantId,
						facilityId: ctx.membership.facilityId,
					},
					profile: ctx.profile,
					tenant: ctx.tenant,
					subscription: ctx.subscription,
					activeSession: ctx.activeSession,
				}
			: EMPTY_CTX;
		event.locals.userCtx = cached;
		return cached;
	};

	if (path === "/" && user) {
		const { membership } = await getCtx();
		if (membership?.role) throw redirect(307, getHomeForRole(membership.role));
	}

	if (isPublic) return resolve(event);
	if (!user) throw redirect(307, "/");

	const ctx = await getCtx();
	const role = ctx.membership?.role ?? null;
	const tenantId = ctx.membership?.tenantId ?? null;
	const active = isActive(ctx.subscription);

	if (!tenantId && !isAuthOnly) throw redirect(307, "/onboarding");
	if (tenantId && !active && !isAuthOnly) throw redirect(307, "/billing");
	if (isAuthOnly) return resolve(event);

	const isAdmin = role === "owner" || role === "admin";
	if (path.startsWith("/admin") && !isAdmin) throw redirect(307, getHomeForRole(role));
	if (path.startsWith("/secretary") && !(isAdmin || role === "manager"))
		throw redirect(307, getHomeForRole(role));

	return resolve(event);
};

export const handle = enableSentry ? sequence(sentryHandle(), authHandle) : authHandle;

export const handleError = (enableSentry ? handleErrorWithSentry() : undefined) satisfies
	| HandleServerError
	| undefined;
