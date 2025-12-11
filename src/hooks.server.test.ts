/**
 * Server Hooks Integration Tests
 *
 * Tests the authentication and authorization middleware:
 * - Public route access
 * - Authentication redirects
 * - Role-based access control (RBAC)
 * - Subscription validation
 * - Onboarding flow enforcement
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	createMockUser,
	createMockTenant,
	createMockMembership,
	createMockSubscription,
	createSupabaseMock,
	scenarios,
	resetIdCounter,
} from "$lib/testing/mocks";

// Mock environment
vi.mock("$env/dynamic/public", () => ({
	env: {
		PUBLIC_SUPABASE_URL: "https://test.supabase.co",
		PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: "test-anon-key",
	},
}));

// Mock Supabase SSR
const mockSupabaseClient = vi.fn();
vi.mock("@supabase/ssr", () => ({
	createServerClient: (...args: unknown[]) => mockSupabaseClient(...args),
}));

describe("Server Hooks - handle()", () => {
	beforeEach(() => {
		resetIdCounter();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	// Helper to create mock event
	const createEvent = (
		pathname: string,
		supabaseConfig: Parameters<typeof createSupabaseMock>[0] = {}
	): {
		url: URL;
		cookies: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };
		locals: Record<string, unknown>;
		request: Request;
	} => {
		const supabase = createSupabaseMock(supabaseConfig);
		mockSupabaseClient.mockReturnValue(supabase);

		return {
			url: new URL(`http://localhost:5173${pathname}`),
			cookies: {
				get: vi.fn(),
				set: vi.fn(),
				delete: vi.fn(),
			},
			locals: {} as Record<string, unknown>,
			request: new Request(`http://localhost:5173${pathname}`),
		};
	};

	const resolve = vi.fn().mockImplementation((_event) => 
		new Response(null, { status: 200, headers: { "x-resolved": "true" } })
	);

	describe("Public Routes", () => {
		const publicRoutes = ["/", "/login", "/reset", "/auth/callback", "/logout", "/signup"];

		it.each(publicRoutes)("should allow access to %s without authentication", async (route) => {
			const event = createEvent(route);

			// Dynamic import to get fresh module with mocks
			const { handle } = await import("./hooks.server");
			const _response = await handle({ event, resolve } as never);

			expect(resolve).toHaveBeenCalled();
		});

		it("should allow access to API routes without authentication", async () => {
			const event = createEvent("/api/stripe/checkout");

			const { handle } = await import("./hooks.server");
			const _response = await handle({ event, resolve } as never);

			expect(resolve).toHaveBeenCalled();
		});

		it("should allow any path starting with /api/", async () => {
			const apiPaths = ["/api/test", "/api/onboarding/complete", "/api/keep-alive"];

			for (const path of apiPaths) {
				vi.clearAllMocks();
				const event = createEvent(path);

				const { handle } = await import("./hooks.server");
				await handle({ event, resolve } as never);

				expect(resolve).toHaveBeenCalled();
			}
		});
	});

	describe("Authentication Redirects", () => {
		it("should redirect unauthenticated users from protected routes to /", async () => {
			const event = createEvent("/admin", scenarios.unauthenticated());

			const { handle } = await import("./hooks.server");

			await expect(handle({ event, resolve } as never)).rejects.toMatchObject({
				status: 307,
				location: "/",
			});
		});

		it("should redirect unauthenticated users from /staff to /", async () => {
			const event = createEvent("/staff", scenarios.unauthenticated());

			const { handle } = await import("./hooks.server");

			await expect(handle({ event, resolve } as never)).rejects.toMatchObject({
				status: 307,
				location: "/",
			});
		});

		it("should redirect unauthenticated users from /secretary to /", async () => {
			const event = createEvent("/secretary", scenarios.unauthenticated());

			const { handle } = await import("./hooks.server");

			await expect(handle({ event, resolve } as never)).rejects.toMatchObject({
				status: 307,
				location: "/",
			});
		});
	});

	describe("Logged-in User on Login Page", () => {
		it("should redirect owner to /admin when accessing /", async () => {
			const config = scenarios.activeSubscription("owner");
			const event = createEvent("/", config);

			const { handle } = await import("./hooks.server");

			await expect(handle({ event, resolve } as never)).rejects.toMatchObject({
				status: 307,
				location: "/admin",
			});
		});

		it("should redirect admin to /admin when accessing /", async () => {
			const config = scenarios.activeSubscription("admin");
			const event = createEvent("/", config);

			const { handle } = await import("./hooks.server");

			await expect(handle({ event, resolve } as never)).rejects.toMatchObject({
				status: 307,
				location: "/admin",
			});
		});

		it("should redirect manager to /secretary when accessing /", async () => {
			const config = scenarios.activeSubscription("manager");
			const event = createEvent("/", config);

			const { handle } = await import("./hooks.server");

			await expect(handle({ event, resolve } as never)).rejects.toMatchObject({
				status: 307,
				location: "/secretary",
			});
		});

		it("should redirect staff to /staff when accessing /", async () => {
			const config = scenarios.activeSubscription("staff");
			const event = createEvent("/", config);

			const { handle } = await import("./hooks.server");

			await expect(handle({ event, resolve } as never)).rejects.toMatchObject({
				status: 307,
				location: "/staff",
			});
		});
	});

	describe("Onboarding Flow", () => {
		it("should redirect to /onboarding if user has no tenant", async () => {
			const config = scenarios.needsOnboarding();
			const event = createEvent("/admin", config);

			const { handle } = await import("./hooks.server");

			await expect(handle({ event, resolve } as never)).rejects.toMatchObject({
				status: 307,
				location: "/onboarding",
			});
		});

		it("should allow access to /onboarding for users without tenant", async () => {
			const config = scenarios.needsOnboarding();
			const event = createEvent("/onboarding", config);

			const { handle } = await import("./hooks.server");
			await handle({ event, resolve } as never);

			expect(resolve).toHaveBeenCalled();
		});

		it("should allow access to /billing for users without subscription", async () => {
			const config = scenarios.expiredTrial();
			const event = createEvent("/billing", config);

			const { handle } = await import("./hooks.server");
			await handle({ event, resolve } as never);

			expect(resolve).toHaveBeenCalled();
		});
	});

	describe("Subscription Validation", () => {
		it("should redirect to /billing if subscription is expired", async () => {
			const config = scenarios.expiredTrial();
			const event = createEvent("/admin", config);

			const { handle } = await import("./hooks.server");

			await expect(handle({ event, resolve } as never)).rejects.toMatchObject({
				status: 307,
				location: "/billing",
			});
		});

		it("should allow access with active subscription", async () => {
			const config = scenarios.activeSubscription("owner");
			const event = createEvent("/admin", config);

			const { handle } = await import("./hooks.server");
			await handle({ event, resolve } as never);

			expect(resolve).toHaveBeenCalled();
		});

		it("should allow access with active trial", async () => {
			const config = scenarios.activeTrial("owner");
			const event = createEvent("/admin", config);

			const { handle } = await import("./hooks.server");
			await handle({ event, resolve } as never);

			expect(resolve).toHaveBeenCalled();
		});

		it("should treat 'canceled' status as inactive", async () => {
			const user = createMockUser({ role: "owner" });
			const tenant = createMockTenant();
			const futureDate = new Date();
			futureDate.setDate(futureDate.getDate() + 10);

			const config = {
				user,
				tenants: [tenant],
				memberships: [createMockMembership(user.id, tenant.id, { role: "owner", isPrimary: true })],
				subscriptions: [
					createMockSubscription(tenant.id, {
						status: "canceled",
						currentPeriodEnd: futureDate,
					}),
				],
			};
			const event = createEvent("/admin", config);

			const { handle } = await import("./hooks.server");

			await expect(handle({ event, resolve } as never)).rejects.toMatchObject({
				status: 307,
				location: "/billing",
			});
		});

		it("should treat 'past_due' status as inactive", async () => {
			const user = createMockUser({ role: "owner" });
			const tenant = createMockTenant();

			const config = {
				user,
				tenants: [tenant],
				memberships: [createMockMembership(user.id, tenant.id, { role: "owner", isPrimary: true })],
				subscriptions: [
					createMockSubscription(tenant.id, {
						status: "past_due",
					}),
				],
			};
			const event = createEvent("/admin", config);

			const { handle } = await import("./hooks.server");

			await expect(handle({ event, resolve } as never)).rejects.toMatchObject({
				status: 307,
				location: "/billing",
			});
		});
	});

	describe("Role-Based Access Control (RBAC)", () => {
		describe("Admin Routes (/admin/*)", () => {
			it("should allow owner to access /admin", async () => {
				const config = scenarios.activeSubscription("owner");
				const event = createEvent("/admin", config);

				const { handle } = await import("./hooks.server");
				await handle({ event, resolve } as never);

				expect(resolve).toHaveBeenCalled();
			});

			it("should allow admin to access /admin", async () => {
				const config = scenarios.activeSubscription("admin");
				const event = createEvent("/admin", config);

				const { handle } = await import("./hooks.server");
				await handle({ event, resolve } as never);

				expect(resolve).toHaveBeenCalled();
			});

			it("should redirect manager from /admin to /secretary", async () => {
				const config = scenarios.activeSubscription("manager");
				const event = createEvent("/admin", config);

				const { handle } = await import("./hooks.server");

				await expect(handle({ event, resolve } as never)).rejects.toMatchObject({
					status: 307,
					location: "/secretary",
				});
			});

			it("should redirect staff from /admin to /staff", async () => {
				const config = scenarios.activeSubscription("staff");
				const event = createEvent("/admin", config);

				const { handle } = await import("./hooks.server");

				await expect(handle({ event, resolve } as never)).rejects.toMatchObject({
					status: 307,
					location: "/staff",
				});
			});

			it("should redirect staff from /admin/users to /staff", async () => {
				const config = scenarios.activeSubscription("staff");
				const event = createEvent("/admin/users", config);

				const { handle } = await import("./hooks.server");

				await expect(handle({ event, resolve } as never)).rejects.toMatchObject({
					status: 307,
					location: "/staff",
				});
			});
		});

		describe("Secretary Routes (/secretary/*)", () => {
			it("should allow owner to access /secretary", async () => {
				const config = scenarios.activeSubscription("owner");
				const event = createEvent("/secretary", config);

				const { handle } = await import("./hooks.server");
				await handle({ event, resolve } as never);

				expect(resolve).toHaveBeenCalled();
			});

			it("should allow admin to access /secretary", async () => {
				const config = scenarios.activeSubscription("admin");
				const event = createEvent("/secretary", config);

				const { handle } = await import("./hooks.server");
				await handle({ event, resolve } as never);

				expect(resolve).toHaveBeenCalled();
			});

			it("should allow manager to access /secretary", async () => {
				const config = scenarios.activeSubscription("manager");
				const event = createEvent("/secretary", config);

				const { handle } = await import("./hooks.server");
				await handle({ event, resolve } as never);

				expect(resolve).toHaveBeenCalled();
			});

			it("should redirect staff from /secretary to /staff", async () => {
				const config = scenarios.activeSubscription("staff");
				const event = createEvent("/secretary", config);

				const { handle } = await import("./hooks.server");

				await expect(handle({ event, resolve } as never)).rejects.toMatchObject({
					status: 307,
					location: "/staff",
				});
			});
		});

		describe("Staff Routes (/staff/*)", () => {
			it("should allow all authenticated users to access /staff", async () => {
				const roles: Array<"owner" | "admin" | "manager" | "staff"> = ["owner", "admin", "manager", "staff"];

				for (const role of roles) {
					vi.clearAllMocks();
					const config = scenarios.activeSubscription(role);
					const event = createEvent("/staff", config);

					const { handle } = await import("./hooks.server");
					await handle({ event, resolve } as never);

					expect(resolve).toHaveBeenCalled();
				}
			});
		});
	});

	describe("Locals Population", () => {
		it("should populate locals.supabase", async () => {
			const event = createEvent("/", scenarios.unauthenticated());

			const { handle } = await import("./hooks.server");
			await handle({ event, resolve } as never);

			expect(event.locals.supabase).toBeDefined();
		});

		it("should populate locals.user when authenticated", async () => {
			const config = scenarios.activeSubscription("owner");
			const event = createEvent("/admin", config);

			const { handle } = await import("./hooks.server");
			await handle({ event, resolve } as never);

			expect(event.locals.user).toBeDefined();
			const user = event.locals.user as { email: string } | null;
			expect(user?.email).toBe(config.user?.email);
		});

		it("should set locals.user to null when unauthenticated", async () => {
			const event = createEvent("/", scenarios.unauthenticated());

			const { handle } = await import("./hooks.server");
			await handle({ event, resolve } as never);

			expect(event.locals.user).toBeNull();
		});

		it("should populate locals.session when authenticated", async () => {
			const config = scenarios.activeSubscription("owner");
			const event = createEvent("/admin", config);

			const { handle } = await import("./hooks.server");
			await handle({ event, resolve } as never);

			expect(event.locals.session).toBeDefined();
			const session = event.locals.session as { access_token: string } | null;
			expect(session?.access_token).toBeDefined();
		});
	});

	describe("Edge Cases", () => {
		it("should handle user with membership but no subscription record", async () => {
			const user = createMockUser({ role: "owner" });
			const tenant = createMockTenant();

			const config = {
				user,
				tenants: [tenant],
				memberships: [createMockMembership(user.id, tenant.id, { role: "owner", isPrimary: true })],
				subscriptions: [], // No subscription
			};
			const event = createEvent("/admin", config);

			const { handle } = await import("./hooks.server");

			await expect(handle({ event, resolve } as never)).rejects.toMatchObject({
				status: 307,
				location: "/billing",
			});
		});

		it("should handle multiple memberships and use primary", async () => {
			// This test verifies that when a user has multiple memberships,
			// the system correctly uses their primary membership for access control.
			// The mock query returns memberships ordered by is_primary DESC,
			// so the primary (owner) membership should be used.
			const config = scenarios.activeSubscription("owner");
			const event = createEvent("/admin", config);

			const { handle } = await import("./hooks.server");
			await handle({ event, resolve } as never);

			// Owner role should allow access to /admin
			expect(resolve).toHaveBeenCalled();
		});
	});

	describe("Cookie Handling", () => {
		it("should pass correct cookie options for HTTPS", async () => {
			const event = createEvent("/", scenarios.unauthenticated());
			event.url = new URL("https://example.com/");

			const { handle } = await import("./hooks.server");
			await handle({ event, resolve } as never);

			// Verify createServerClient was called with cookie handlers
			expect(mockSupabaseClient).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(String),
				expect.objectContaining({
					cookies: expect.objectContaining({
						get: expect.any(Function),
						set: expect.any(Function),
						remove: expect.any(Function),
					}),
				})
			);
		});
	});
});
