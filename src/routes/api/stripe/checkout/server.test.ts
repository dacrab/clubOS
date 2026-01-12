import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMockUser, createMockTenant, createMockLocals, createMockRequest, resetIdCounter } from "$lib/testing/mocks";

vi.mock("$env/dynamic/private", () => ({ env: { STRIPE_SECRET_KEY: "sk_test_mock" } }));

const mockFetch = vi.fn();
const originalFetch = globalThis.fetch;

describe("POST /api/stripe/checkout", () => {
	beforeEach(() => { resetIdCounter(); vi.clearAllMocks(); globalThis.fetch = mockFetch; });
	afterEach(() => { globalThis.fetch = originalFetch; });

	const setupMocks = (opts: { customerOk?: boolean; sessionOk?: boolean; customerId?: string; sessionUrl?: string } = {}) => {
		const { customerOk = true, sessionOk = true, customerId = "cus_test", sessionUrl = "https://checkout.stripe.com/test" } = opts;
		mockFetch.mockImplementation((url: string) => {
			if (url.includes("/v1/customers")) return Promise.resolve({ ok: customerOk, json: () => Promise.resolve(customerOk ? { id: customerId } : { error: { message: "Customer failed" } }) });
			if (url.includes("/v1/checkout/sessions")) return Promise.resolve({ ok: sessionOk, json: () => Promise.resolve(sessionOk ? { url: sessionUrl } : { error: { message: "Session failed" } }) });
			return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
		});
	};

	const req = (body: object, user = createMockUser()) => ({ request: createMockRequest({ method: "POST", body }), locals: createMockLocals({ user }) });

	it.each([
		[{ userId: "x", email: "x" }, "priceId missing"],
		[{ priceId: "x", email: "x" }, "userId missing"],
		[{ priceId: "x", userId: "x" }, "email missing"],
	])("returns 400 for %s", async (body) => {
		const { POST } = await import("./+server");
		const response = await POST(req(body) as never);
		expect(response.status).toBe(400);
	});

	it("creates customer and session for new user", async () => {
		setupMocks();
		const user = createMockUser();
		const { POST } = await import("./+server");
		const response = await POST(req({ priceId: "price_test", userId: user.id, email: user.email }, user) as never);
		expect(response.status).toBe(200);
		expect((await response.json()).url).toContain("checkout.stripe.com");
		expect(mockFetch).toHaveBeenCalledWith("https://api.stripe.com/v1/customers", expect.objectContaining({ method: "POST" }));
	});

	it("reuses existing customer from subscription", async () => {
		const existingId = "cus_existing";
		setupMocks({ customerId: existingId });
		const user = createMockUser(), tenant = createMockTenant();
		const { request } = req({ priceId: "price_test", userId: user.id, email: user.email, tenantId: tenant.id }, user);
		const locals = createMockLocals({ user, tenants: [tenant], subscriptions: [{ tenantId: tenant.id, status: "trialing", stripeCustomerId: existingId }] });
		const { POST } = await import("./+server");
		await POST({ request, locals } as never);
		const sessionCall = mockFetch.mock.calls.find((c) => c[0].includes("/v1/checkout/sessions"));
		expect(sessionCall?.[1].body.get("customer")).toBe(existingId);
	});

	it("creates new customer if existing has temp_ prefix", async () => {
		setupMocks();
		const user = createMockUser(), tenant = createMockTenant();
		const { request } = req({ priceId: "price_test", userId: user.id, email: user.email, tenantId: tenant.id }, user);
		const locals = createMockLocals({ user, tenants: [tenant], subscriptions: [{ tenantId: tenant.id, status: "trialing", stripeCustomerId: "temp_x" }] });
		const { POST } = await import("./+server");
		await POST({ request, locals } as never);
		expect(mockFetch.mock.calls.some((c) => c[0].includes("/v1/customers"))).toBe(true);
	});

	it("includes correct session params", async () => {
		setupMocks();
		const user = createMockUser(), tenant = createMockTenant();
		const { POST } = await import("./+server");
		await POST(req({ priceId: "price_pro", userId: user.id, email: user.email, tenantId: tenant.id }, user) as never);
		const sessionCall = mockFetch.mock.calls.find((c) => c[0].includes("/v1/checkout/sessions"));
		const body = sessionCall?.[1].body;
		expect(body?.get("line_items[0][price]")).toBe("price_pro");
		expect(body?.get("mode")).toBe("subscription");
	});

	it.each([
		[{ customerOk: false }, "Customer failed"],
		[{ sessionOk: false }, "Session failed"],
	])("returns 500 on Stripe error: %s", async (opts, expectedError) => {
		setupMocks(opts);
		const user = createMockUser();
		const { POST } = await import("./+server");
		const response = await POST(req({ priceId: "price_test", userId: user.id, email: user.email }, user) as never);
		expect(response.status).toBe(500);
		expect((await response.json()).error).toBe(expectedError);
	});

	it("handles network errors", async () => {
		mockFetch.mockRejectedValue(new Error("Network error"));
		const user = createMockUser();
		const { POST } = await import("./+server");
		const response = await POST(req({ priceId: "price_test", userId: user.id, email: user.email }, user) as never);
		expect(response.status).toBe(500);
	});
});
