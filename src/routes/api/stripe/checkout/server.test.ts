import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMockUser, createMockTenant, createMockLocals, createMockRequest } from "$lib/testing/mocks";

vi.mock("$env/dynamic/private", () => ({ env: { STRIPE_SECRET_KEY: "sk_test_mock" } }));

const mockFetch = vi.fn();
const originalFetch = globalThis.fetch;

describe("POST /api/stripe/checkout", () => {
	beforeEach(() => { vi.clearAllMocks(); globalThis.fetch = mockFetch; });
	afterEach(() => { globalThis.fetch = originalFetch; });

	const setupMocks = (opts: { customerOk?: boolean; sessionOk?: boolean; customerId?: string } = {}): void => {
		const { customerOk = true, sessionOk = true, customerId = "cus_test" } = opts;
		mockFetch.mockImplementation((url: string) => {
			if (url.includes("/v1/customers")) return Promise.resolve({ ok: customerOk, json: () => Promise.resolve(customerOk ? { id: customerId } : { error: { message: "Customer failed" } }) });
			if (url.includes("/v1/checkout/sessions")) return Promise.resolve({ ok: sessionOk, json: () => Promise.resolve(sessionOk ? { url: "https://checkout.stripe.com/test" } : { error: { message: "Session failed" } }) });
			return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
		});
	};

	const req = (body: object, user = createMockUser()): { request: Request; locals: ReturnType<typeof createMockLocals> } => ({ request: createMockRequest({ method: "POST", body }), locals: createMockLocals({ user }) });

	it("creates customer and session for new user", async () => {
		setupMocks();
		const user = createMockUser();
		const { POST } = await import("./+server");
		const response = await POST(req({ priceId: "price_test", userId: user.id, email: user.email }, user) as never);
		expect(response.status).toBe(200);
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

	it("returns 500 on Stripe API error", async () => {
		setupMocks({ customerOk: false });
		const user = createMockUser();
		const { POST } = await import("./+server");
		const response = await POST(req({ priceId: "price_test", userId: user.id, email: user.email }, user) as never);
		expect(response.status).toBe(500);
	});
});
