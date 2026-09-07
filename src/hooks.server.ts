import { handleErrorWithSentry, sentryHandle } from "@sentry/sveltekit";
import { type Handle, type HandleServerError, redirect } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import { withClerkHandler } from "svelte-clerk/server";
import { getHomeForRole } from "$lib/config/auth";
import { EMPTY_CTX, resolveUserContext } from "$lib/server/auth";
import { isActive } from "$lib/server/polar";
import { checkRateLimit } from "$lib/server/rate-limiter";
import type { MemberRole } from "$lib/types/database";

const enableSentry = typeof process !== "undefined" && !process.env.VITEST;

const PUBLIC_ROUTES = ["/", "/signup"];
const AUTH_ONLY_ROUTES = ["/onboarding", "/billing"];
// Customer-facing manage page; auth is enforced by its HMAC ?token= param.
const BOOKING_MANAGE_RE = /^\/booking\/[^/]+\/manage$/;

type RouteAccess = { isPublic: boolean; isAuthOnly: boolean };

function classifyRoute(path: string): RouteAccess {
	return {
		isPublic:
			PUBLIC_ROUTES.includes(path) || BOOKING_MANAGE_RE.test(path) || path.startsWith("/api/"),
		isAuthOnly: AUTH_ONLY_ROUTES.includes(path),
	};
}

function requireRole(path: string, role: MemberRole | null): void {
	const isAdmin = role === "owner" || role === "admin";
	if (path.startsWith("/admin") && !isAdmin) throw redirect(307, getHomeForRole(role));
	if (path.startsWith("/secretary") && !(isAdmin || role === "manager"))
		throw redirect(307, getHomeForRole(role));
}

/**
 * svelte-clerk sets locals.auth to a function returning the request's auth object.
 * Narrow with a runtime guard instead of a cast so a svelte-clerk upgrade that
 * changes the shape fails closed to signed-out rather than mistyping every
 * downstream auth decision. (Single justified cast, inside the guard.)
 */
function asAuthFn(v: unknown): (() => { userId: string | null }) | null {
	return typeof v === "function" ? (v as () => { userId: string | null }) : null;
}

const authHandle: Handle = async ({ event, resolve }) => {
	const authFn = asAuthFn(event.locals.auth);
	const userId = authFn ? (authFn().userId ?? null) : null;
	event.locals.userId = userId;

	const path = event.url.pathname;
	const { isPublic, isAuthOnly } = classifyRoute(path);

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

	if (!(tenantId || isAuthOnly)) throw redirect(307, "/onboarding");
	if (tenantId && !active && !isAuthOnly) throw redirect(307, "/billing");
	if (isAuthOnly) return resolve(event);

	requireRole(path, role);

	return resolve(event);
};

const securityHandle: Handle = async ({ event, resolve }) => {
	// Last entry of x-forwarded-for is the client IP appended by our own proxy/CDN;
	// earlier entries are attacker-controlled.
	const ip =
		event.request.headers.get("x-forwarded-for")?.split(",").pop()?.trim() ??
		event.getClientAddress();

	if (event.request.method !== "GET" && event.request.method !== "HEAD") {
		const result = await checkRateLimit(`write:${ip}`, "burst");
		if (!result.allowed) {
			return new Response("Too Many Requests", {
				status: 429,
				headers: {
					"retry-after": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
				},
			});
		}
	}

	const result = await checkRateLimit(`read:${ip}`, "minute");
	if (!result.allowed) {
		return new Response("Too Many Requests", {
			status: 429,
			headers: {
				"retry-after": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
			},
		});
	}

	const response = await resolve(event);

	// CSP is configured in svelte.config.js (kit.csp, mode 'nonce') so Kit can
	// inject per-request nonces; we only add the non-CSP hardening headers here.
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
