import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockMembership, createMockTenant, createMockUser } from "$lib/testing/mocks";

const { mockResolveUserContext } = vi.hoisted(() => ({
	mockResolveUserContext: vi.fn(),
}));

vi.mock("$lib/server/auth", () => ({
	resolveUserContext: mockResolveUserContext,
	EMPTY_CTX: {
		membership: null,
		profile: null,
		tenant: null,
		subscription: null,
		activeSession: null,
	},
}));

vi.mock("$lib/server/polar", () => ({
	isActive: (sub: Record<string, unknown> | null) => sub?.status === "active",
}));

vi.mock("@sveltejs/kit/hooks", () => ({
	sequence: (...handlers: Array<(e: unknown) => unknown>) => {
		return async (event: unknown) => {
			for (const h of handlers) {
				const result = await h(event);
				if (result instanceof Response) return result;
			}
		};
	},
}));

vi.mock("svelte-clerk/server", () => ({
	withClerkHandler: () => (o: unknown) => o,
}));

vi.mock("$lib/server/rate-limiter", () => ({
	checkRateLimit: () => ({ allowed: true, remaining: 999, resetAt: Date.now() + 60000 }),
}));

import { handle } from "./hooks.server";

describe("hooks.server", () => {
	let resolve: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
		resolve = vi.fn().mockResolvedValue(new Response());
	});

	const createEvent = (pathname: string, locals: Record<string, unknown> = {}) => ({
		url: new URL(`http://localhost${pathname}`),
		request: new Request(`http://localhost${pathname}`),
		locals,
		getClientAddress: () => "127.0.0.1",
		fetch: vi.fn(),
		cookies: { get: vi.fn(), getAll: vi.fn(), set: vi.fn(), delete: vi.fn(), serialize: vi.fn() },
		isDataRequest: false,
		isSubRequest: false,
		params: {},
		platform: {},
		route: { id: null },
		setHeaders: vi.fn(),
	});

	const setupAuth = (userId: string | null, ctx?: unknown) => {
		const locals: Record<string, unknown> = {
			auth: vi.fn().mockReturnValue({ userId }),
		};
		if (ctx) mockResolveUserContext.mockResolvedValue(ctx);
		return locals;
	};

	const runHandle = async (event: Record<string, unknown>): Promise<Response> =>
		handle({ event, resolve } as never);

	describe("public routes", () => {
		it.each(["/", "/signup"])("allows access to %s without auth", async (route) => {
			const response = await runHandle(createEvent(route, setupAuth(null)));
			expect(resolve).toHaveBeenCalledOnce();
			expect(response).toBeInstanceOf(Response);
		});

		it("allows the token-based booking manage page without auth", async () => {
			const response = await runHandle(
				createEvent(
					"/booking/550e8400-e29b-41d4-a716-446655440000/manage?token=x",
					setupAuth(null),
				),
			);
			expect(resolve).toHaveBeenCalledOnce();
			expect(response).toBeInstanceOf(Response);
		});

		it("still requires auth for other booking routes", async () => {
			await expect(
				runHandle(
					createEvent("/booking/550e8400-e29b-41d4-a716-446655440000/edit", setupAuth(null)),
				),
			).rejects.toMatchObject({ status: 307 });
		});
	});

	describe("API routes", () => {
		it.each(["/api/admin/users", "/api/auth/callback", "/api/test"])(
			"allows access to %s without auth",
			async (route) => {
				const response = await runHandle(createEvent(route, setupAuth(null)));
				expect(resolve).toHaveBeenCalledOnce();
				expect(response).toBeInstanceOf(Response);
			},
		);
	});

	describe("auth redirects", () => {
		it.each(["/admin", "/staff", "/secretary"])(
			"redirects unauthenticated from %s to /",
			async (route) => {
				await expect(runHandle(createEvent(route, setupAuth(null)))).rejects.toMatchObject({
					status: 307,
				});
			},
		);
	});

	describe("role-based homepage", () => {
		it.each([
			["owner", "/admin"],
			["admin", "/admin"],
			["manager", "/secretary"],
			["staff", "/staff"],
		] as const)("%s → %s", async (role, dest) => {
			const user = createMockUser({ role });
			const tenant = createMockTenant();
			const ctx = {
				membership: createMockMembership(user.id, tenant.id, { role, isPrimary: true }),
				subscription: { status: "active" as const, trialEnd: null, periodEnd: null },
				tenant,
			};
			await expect(runHandle(createEvent("/", setupAuth(user.id, ctx)))).rejects.toMatchObject({
				location: dest,
			});
		});
	});

	describe("onboarding flow", () => {
		it("redirects to /onboarding if no tenant", async () => {
			const user = createMockUser();
			const ctx = {
				membership: null,
				subscription: null,
				tenant: null,
				profile: null,
				activeSession: null,
			};
			await expect(runHandle(createEvent("/admin", setupAuth(user.id, ctx)))).rejects.toMatchObject(
				{ location: "/onboarding" },
			);
		});
	});

	describe("subscription validation", () => {
		it("redirects to /billing if expired", async () => {
			const user = createMockUser({ role: "owner" });
			const tenant = createMockTenant();
			const ctx = {
				membership: createMockMembership(user.id, tenant.id, { role: "owner", isPrimary: true }),
				subscription: {
					status: "trialing" as const,
					trialEnd: new Date(Date.now() - 86400000).toISOString(),
					periodEnd: null,
				},
				tenant,
			};
			await expect(runHandle(createEvent("/admin", setupAuth(user.id, ctx)))).rejects.toMatchObject(
				{ location: "/billing" },
			);
		});
	});

	describe("RBAC - allowed", () => {
		it.each([
			["/admin", "owner"],
			["/admin", "admin"],
			["/secretary", "manager"],
			["/staff", "staff"],
		] as const)("%s allows %s", async (route, role) => {
			const user = createMockUser({ role });
			const tenant = createMockTenant();
			const ctx = {
				membership: createMockMembership(user.id, tenant.id, { role, isPrimary: true }),
				subscription: { status: "active" as const, trialEnd: null, periodEnd: null },
				tenant,
			};
			await runHandle(createEvent(route, setupAuth(user.id, ctx)));
			expect(resolve).toHaveBeenCalledOnce();
		});
	});

	describe("RBAC - denied", () => {
		it.each([
			["/admin", "manager"],
			["/admin", "staff"],
			["/secretary", "staff"],
		] as const)("%s denies %s", async (route, role) => {
			const user = createMockUser({ role });
			const tenant = createMockTenant();
			const ctx = {
				membership: createMockMembership(user.id, tenant.id, { role, isPrimary: true }),
				subscription: { status: "active" as const, trialEnd: null, periodEnd: null },
				tenant,
			};
			await expect(runHandle(createEvent(route, setupAuth(user.id, ctx)))).rejects.toMatchObject({
				status: 307,
			});
		});
	});
});
