import { handleErrorWithSentry, sentryHandle } from "@sentry/sveltekit";
import { type Handle, type HandleServerError, redirect } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import { withClerkHandler } from "svelte-clerk/server";
import { getHomeForRole } from "$lib/config/auth";
import { EMPTY_CTX, resolveUserContext } from "$lib/server/auth";
import { isActive } from "$lib/server/polar";
import { checkRateLimit } from "$lib/server/rate-limiter";

const enableSentry = typeof process !== "undefined" && !process.env.VITEST;

const PUBLIC_ROUTES = ["/", "/signup", "/reset"];
const AUTH_ONLY_ROUTES = ["/onboarding", "/billing"];

const authHandle: Handle = async ({ event, resolve }) => {
	const authFn = event.locals.auth as (opts?: unknown) => { userId: string | null };
	const auth = typeof authFn === "function" ? authFn() : authFn;
	const userId = auth?.userId ?? null;
	event.locals.userId = userId;

	const path = event.url.pathname;
	const isPublic = PUBLIC_ROUTES.includes(path) || path.startsWith("/api/");
	const isAuthOnly = AUTH_ONLY_ROUTES.includes(path);

	let cached: App.UserContext | undefined;
	const getCtx = async (): Promise<App.UserContext> => {
		if (cached) return cached;
		if (!userId) {
			cached = EMPTY_CTX;
			return cached;
		}
		cached = await resolveUserContext(userId);
		event.locals.userCtx = cached;
		return cached;
	};

	if (path === "/" && userId) {
		const { membership } = await getCtx();
		if (membership?.role) {
			throw redirect(307, getHomeForRole(membership.role));
		}
	}

	if (isPublic) return resolve(event);
	if (!userId) throw redirect(307, "/");

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

const securityHandle: Handle = async ({ event, resolve }) => {
	const ip =
		event.request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? event.getClientAddress();

	if (event.request.method !== "GET" && event.request.method !== "HEAD") {
		const result = checkRateLimit(`write:${ip}`, "burst");
		if (!result.allowed) {
			return new Response("Too Many Requests", {
				status: 429,
				headers: {
					"retry-after": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
				},
			});
		}
	}

	const result = checkRateLimit(`read:${ip}`, "minute");
	if (!result.allowed) {
		return new Response("Too Many Requests", {
			status: 429,
			headers: {
				"retry-after": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
			},
		});
	}

	const response = await resolve(event);

	const csp = [
		"default-src 'self'",
		"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://js.sentry-cdn.com",
		"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
		"img-src 'self' data: blob: https://img.clerk.com https://*.clerk.accounts.dev",
		"font-src 'self' https://fonts.gstatic.com",
		"connect-src 'self' https://*.clerk.accounts.dev https://*.ingest.sentry.io wss://*.clerk.accounts.dev",
		"frame-src 'self' https://*.clerk.accounts.dev",
		"object-src 'none'",
		"base-uri 'self'",
		"form-action 'self'",
	].join("; ");

	response.headers.set("content-security-policy", csp);
	response.headers.set("x-content-type-options", "nosniff");
	response.headers.set("x-frame-options", "DENY");
	response.headers.set("x-xss-protection", "0");
	response.headers.set("referrer-policy", "strict-origin-when-cross-origin");
	response.headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");

	return response;
};

export const handle = enableSentry
	? sequence(sentryHandle(), withClerkHandler(), authHandle, securityHandle)
	: sequence(withClerkHandler(), authHandle, securityHandle);

export const handleError: HandleServerError | undefined = enableSentry
	? handleErrorWithSentry()
	: undefined;
