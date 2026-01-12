import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, scenarios, resetIdCounter, createMockUser, createMockTenant, createMockMembership, createMockSubscription } from "$lib/testing/mocks";

vi.mock("$env/dynamic/public", () => ({ env: { PUBLIC_SUPABASE_URL: "https://test.supabase.co", PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: "test-key" } }));

const mockSupabaseClient = vi.fn();
vi.mock("@supabase/ssr", () => ({ createServerClient: (...args: unknown[]) => mockSupabaseClient(...args) }));

describe("hooks.server", () => {
	beforeEach(() => { resetIdCounter(); vi.clearAllMocks(); });

	const createEvent = (pathname: string, config = {}) => {
		mockSupabaseClient.mockReturnValue(createSupabaseMock(config));
		return { url: new URL(`http://localhost${pathname}`), cookies: { get: vi.fn(), set: vi.fn(), delete: vi.fn() }, locals: {}, request: new Request(`http://localhost${pathname}`) };
	};
	const resolve = vi.fn().mockResolvedValue(new Response());
	const runHandle = async (event: ReturnType<typeof createEvent>) => (await import("./hooks.server")).handle({ event, resolve } as never);

	describe("public routes", () => {
		it.each(["/", "/login", "/reset", "/auth/callback", "/logout", "/signup", "/api/test"])("allows %s without auth", async (route) => {
			await runHandle(createEvent(route));
			expect(resolve).toHaveBeenCalled();
		});
	});

	describe("auth redirects", () => {
		it.each(["/admin", "/staff", "/secretary"])("redirects unauthenticated from %s to /", async (route) => {
			await expect(runHandle(createEvent(route, scenarios.unauthenticated()))).rejects.toMatchObject({ status: 307, location: "/" });
		});
	});

	describe("logged-in user on /", () => {
		it.each([
			["owner", "/admin"], ["admin", "/admin"], ["manager", "/secretary"], ["staff", "/staff"]
		] as const)("%s redirects to %s", async (role, dest) => {
			await expect(runHandle(createEvent("/", scenarios.activeSubscription(role)))).rejects.toMatchObject({ status: 307, location: dest });
		});
	});

	describe("onboarding flow", () => {
		it("redirects to /onboarding if no tenant", async () => {
			await expect(runHandle(createEvent("/admin", scenarios.needsOnboarding()))).rejects.toMatchObject({ location: "/onboarding" });
		});
		it("allows /onboarding without tenant", async () => {
			await runHandle(createEvent("/onboarding", scenarios.needsOnboarding()));
			expect(resolve).toHaveBeenCalled();
		});
		it("allows /billing without subscription", async () => {
			await runHandle(createEvent("/billing", scenarios.expiredTrial()));
			expect(resolve).toHaveBeenCalled();
		});
	});

	describe("subscription validation", () => {
		it("redirects to /billing if expired", async () => {
			await expect(runHandle(createEvent("/admin", scenarios.expiredTrial()))).rejects.toMatchObject({ location: "/billing" });
		});
		it("allows active subscription", async () => {
			await runHandle(createEvent("/admin", scenarios.activeSubscription("owner")));
			expect(resolve).toHaveBeenCalled();
		});
		it("allows active trial", async () => {
			await runHandle(createEvent("/admin", scenarios.activeTrial("owner")));
			expect(resolve).toHaveBeenCalled();
		});
		it.each(["canceled", "past_due"] as const)("treats %s as inactive", async (status) => {
			const user = createMockUser({ role: "owner" }), tenant = createMockTenant();
			const config = { user, tenants: [tenant], memberships: [createMockMembership(user.id, tenant.id, { role: "owner", isPrimary: true })], subscriptions: [createMockSubscription(tenant.id, { status })] };
			await expect(runHandle(createEvent("/admin", config))).rejects.toMatchObject({ location: "/billing" });
		});
	});

	describe("RBAC", () => {
		it.each([
			["/admin", "owner", true], ["/admin", "admin", true], ["/admin", "manager", false], ["/admin", "staff", false],
			["/secretary", "owner", true], ["/secretary", "admin", true], ["/secretary", "manager", true], ["/secretary", "staff", false],
			["/staff", "owner", true], ["/staff", "admin", true], ["/staff", "manager", true], ["/staff", "staff", true],
		] as const)("%s access for %s = %s", async (route, role, allowed) => {
			const event = createEvent(route, scenarios.activeSubscription(role));
			if (allowed) {
				await runHandle(event);
				expect(resolve).toHaveBeenCalled();
			} else {
				await expect(runHandle(event)).rejects.toMatchObject({ status: 307 });
			}
		});
	});

	describe("locals", () => {
		it("populates supabase, user, session", async () => {
			const config = scenarios.activeSubscription("owner");
			const event = createEvent("/admin", config);
			await runHandle(event);
			expect(event.locals.supabase).toBeDefined();
			expect(event.locals.user).toBeDefined();
			expect(event.locals.session).toBeDefined();
		});
		it("sets user/session null when unauthenticated", async () => {
			const event = createEvent("/", scenarios.unauthenticated());
			await runHandle(event);
			expect(event.locals.user).toBeNull();
		});
	});
});
