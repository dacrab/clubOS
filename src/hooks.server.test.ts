import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, scenarios, createMockUser, createMockTenant, createMockMembership, createMockSubscription } from "$lib/testing/mocks";

vi.mock("$env/dynamic/public", () => ({ env: { PUBLIC_SUPABASE_URL: "https://test.supabase.co", PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: "test-key" } }));

const mockSupabaseClient = vi.fn();
vi.mock("@supabase/ssr", () => ({ createServerClient: (...args: unknown[]) => mockSupabaseClient(...args) }));

describe("hooks.server", () => {
	beforeEach(() => { vi.clearAllMocks(); });

	const createEvent = (pathname: string, config = {}) => {
		mockSupabaseClient.mockReturnValue(createSupabaseMock(config));
		return { url: new URL(`http://localhost${pathname}`), cookies: { get: vi.fn(), set: vi.fn(), delete: vi.fn() }, locals: {}, request: new Request(`http://localhost${pathname}`) };
	};
	const resolve = vi.fn().mockResolvedValue(new Response());
	const runHandle = async (event: ReturnType<typeof createEvent>) => (await import("./hooks.server")).handle({ event, resolve } as never);

	describe("auth redirects", () => {
		it.each(["/admin", "/staff", "/secretary"])("redirects unauthenticated from %s to /", async (route) => {
			await expect(runHandle(createEvent(route, scenarios.unauthenticated()))).rejects.toMatchObject({ status: 307, location: "/" });
		});
	});

	describe("role-based homepage", () => {
		it.each([["owner", "/admin"], ["admin", "/admin"], ["manager", "/secretary"], ["staff", "/staff"]] as const)("%s → %s", async (role, dest) => {
			await expect(runHandle(createEvent("/", scenarios.activeSubscription(role)))).rejects.toMatchObject({ location: dest });
		});
	});

	describe("onboarding flow", () => {
		it("redirects to /onboarding if no tenant", async () => {
			await expect(runHandle(createEvent("/admin", scenarios.needsOnboarding()))).rejects.toMatchObject({ location: "/onboarding" });
		});
	});

	describe("subscription validation", () => {
		it("redirects to /billing if expired", async () => {
			await expect(runHandle(createEvent("/admin", scenarios.expiredTrial()))).rejects.toMatchObject({ location: "/billing" });
		});

		it.each(["canceled", "past_due"] as const)("treats %s as inactive", async (status) => {
			const user = createMockUser({ role: "owner" }), tenant = createMockTenant();
			const config = { user, tenants: [tenant], memberships: [createMockMembership(user.id, tenant.id, { role: "owner", isPrimary: true })], subscriptions: [createMockSubscription(tenant.id, { status })] };
			await expect(runHandle(createEvent("/admin", config))).rejects.toMatchObject({ location: "/billing" });
		});
	});

	describe("RBAC - allowed", () => {
		it.each([["/admin", "owner"], ["/admin", "admin"], ["/secretary", "manager"], ["/staff", "staff"]] as const)("%s allows %s", async (route, role) => {
			await runHandle(createEvent(route, scenarios.activeSubscription(role)));
			expect(resolve).toHaveBeenCalled();
		});
	});

	describe("RBAC - denied", () => {
		it.each([["/admin", "manager"], ["/admin", "staff"], ["/secretary", "staff"]] as const)("%s denies %s", async (route, role) => {
			await expect(runHandle(createEvent(route, scenarios.activeSubscription(role)))).rejects.toMatchObject({ status: 307 });
		});
	});
});
