/**
 * Stripe Checkout API Endpoint Tests
 *
 * Tests the POST /api/stripe/checkout endpoint which:
 * - Creates or retrieves Stripe customers
 * - Creates checkout sessions for subscriptions
 * - Handles existing customers for returning users
 * - Validates required fields
 * - Handles Stripe API errors gracefully
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	createMockUser,
	createMockTenant,
	createMockLocals,
	createMockRequest,
	resetIdCounter,
} from "$lib/testing/mocks";

// Mock environment
vi.mock("$env/dynamic/private", () => ({
	env: {
		STRIPE_SECRET_KEY: "sk_test_mock_key",
	},
}));

// Mock fetch for Stripe API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("POST /api/stripe/checkout", () => {
	beforeEach(() => {
		resetIdCounter();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	// Helper to setup mock fetch responses
	const setupStripeMocks = (options: {
		customerSuccess?: boolean;
		sessionSuccess?: boolean;
		customerId?: string;
		sessionUrl?: string;
	} = {}): void => {
		const {
			customerSuccess = true,
			sessionSuccess = true,
			customerId = `cus_test_${Date.now()}`,
			sessionUrl = "https://checkout.stripe.com/pay/test_session",
		} = options;

		mockFetch.mockImplementation((url: string) => {
			if (url.includes("/v1/customers")) {
				return Promise.resolve({
					ok: customerSuccess,
					json: () =>
						Promise.resolve(
							customerSuccess
								? { id: customerId, email: "test@example.com" }
								: { error: { message: "Customer creation failed" } }
						),
				});
			}
			if (url.includes("/v1/checkout/sessions")) {
				return Promise.resolve({
					ok: sessionSuccess,
					json: () =>
						Promise.resolve(
							sessionSuccess
								? { id: "cs_test_123", url: sessionUrl }
								: { error: { message: "Session creation failed" } }
						),
				});
			}
			return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
		});
	};

	describe("Validation", () => {
		it("should return 400 when priceId is missing", async () => {
			const user = createMockUser();
			const request = createMockRequest({
				method: "POST",
				body: { userId: user.id, email: user.email },
			});
			const locals = createMockLocals({ user });

			const { POST } = await import("./+server");
			const response = await POST({ request, locals } as never);

			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error).toBe("Missing required fields");
		});

		it("should return 400 when userId is missing", async () => {
			const request = createMockRequest({
				method: "POST",
				body: { priceId: "price_test_123", email: "test@example.com" },
			});
			const locals = createMockLocals();

			const { POST } = await import("./+server");
			const response = await POST({ request, locals } as never);

			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error).toBe("Missing required fields");
		});

		it("should return 400 when email is missing", async () => {
			const user = createMockUser();
			const request = createMockRequest({
				method: "POST",
				body: { priceId: "price_test_123", userId: user.id },
			});
			const locals = createMockLocals({ user });

			const { POST } = await import("./+server");
			const response = await POST({ request, locals } as never);

			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error).toBe("Missing required fields");
		});
	});

	describe("Stripe Configuration", () => {
		// Note: Testing missing Stripe key requires module reload which isn't fully
		// supported in bun's vitest. This test documents expected behavior.
		it.skip("should return 500 when Stripe key is not configured", async () => {
			// This test would verify that when STRIPE_SECRET_KEY is missing,
			// the endpoint returns a 500 error with "Stripe not configured" message.
			// Skipped because bun doesn't support vi.doMock for dynamic module re-mocking.
			expect(true).toBe(true);
		});
	});

	describe("New Customer Flow", () => {
		it("should create new Stripe customer when no tenant exists", async () => {
			const user = createMockUser();
			setupStripeMocks();

			const request = createMockRequest({
				method: "POST",
				body: { priceId: "price_test_123", userId: user.id, email: user.email },
			});
			const locals = createMockLocals({ user });

			const { POST } = await import("./+server");
			const response = await POST({ request, locals } as never);

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.url).toContain("checkout.stripe.com");

			// Verify customer creation was called
			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.stripe.com/v1/customers",
				expect.objectContaining({
					method: "POST",
					headers: expect.objectContaining({
						Authorization: "Bearer sk_test_mock_key",
					}),
				})
			);
		});

		it("should include user metadata in customer creation", async () => {
			const user = createMockUser();
			setupStripeMocks();

			const request = createMockRequest({
				method: "POST",
				body: { priceId: "price_test_123", userId: user.id, email: user.email },
			});
			const locals = createMockLocals({ user });

			const { POST } = await import("./+server");
			await POST({ request, locals } as never);

			const customerCall = mockFetch.mock.calls.find((call) =>
				call[0].includes("/v1/customers")
			);
			expect(customerCall).toBeDefined();
			if (!customerCall) throw new Error("Customer call not found");
			const body = customerCall[1].body;
			expect(body.get("email")).toBe(user.email);
			expect(body.get("metadata[supabase_user_id]")).toBe(user.id);
		});
	});

	describe("Existing Customer Flow", () => {
		it("should reuse existing Stripe customer ID from subscription", async () => {
			const user = createMockUser();
			const tenant = createMockTenant();
			const existingCustomerId = "cus_existing_123";

			setupStripeMocks({ customerId: existingCustomerId });

			const request = createMockRequest({
				method: "POST",
				body: {
					priceId: "price_test_123",
					userId: user.id,
					email: user.email,
					tenantId: tenant.id,
				},
			});
			const locals = createMockLocals({
				user,
				tenants: [tenant],
				subscriptions: [
					{
						tenantId: tenant.id,
						status: "trialing",
						stripeCustomerId: existingCustomerId,
					},
				],
			});

			const { POST } = await import("./+server");
			const response = await POST({ request, locals } as never);

			expect(response.status).toBe(200);

			// Verify session was created with existing customer
			const sessionCall = mockFetch.mock.calls.find((call) =>
				call[0].includes("/v1/checkout/sessions")
			);
			expect(sessionCall).toBeDefined();
			if (!sessionCall) throw new Error("Session call not found");
			const body = sessionCall[1].body;
			expect(body.get("customer")).toBe(existingCustomerId);
		});

		it("should create new customer if existing has temp_ prefix", async () => {
			const user = createMockUser();
			const tenant = createMockTenant();
			const newCustomerId = "cus_new_456";

			setupStripeMocks({ customerId: newCustomerId });

			const request = createMockRequest({
				method: "POST",
				body: {
					priceId: "price_test_123",
					userId: user.id,
					email: user.email,
					tenantId: tenant.id,
				},
			});
			const locals = createMockLocals({
				user,
				tenants: [tenant],
				subscriptions: [
					{
						tenantId: tenant.id,
						status: "trialing",
						stripeCustomerId: "temp_placeholder", // Temporary ID
					},
				],
			});

			const { POST } = await import("./+server");
			const response = await POST({ request, locals } as never);

			expect(response.status).toBe(200);

			// Verify new customer was created
			const customerCall = mockFetch.mock.calls.find((call) =>
				call[0].includes("/v1/customers")
			);
			expect(customerCall).toBeDefined();
		});
	});

	describe("Checkout Session Creation", () => {
		it("should create checkout session with correct parameters", async () => {
			const user = createMockUser();
			const tenant = createMockTenant();
			const customerId = "cus_test_789";

			setupStripeMocks({ customerId });

			const request = createMockRequest({
				method: "POST",
				body: {
					priceId: "price_pro_monthly",
					userId: user.id,
					email: user.email,
					tenantId: tenant.id,
				},
				headers: { origin: "https://app.example.com" },
			});
			const locals = createMockLocals({ user, tenants: [tenant] });

			const { POST } = await import("./+server");
			await POST({ request, locals } as never);

			const sessionCall = mockFetch.mock.calls.find((call) =>
				call[0].includes("/v1/checkout/sessions")
			);
			expect(sessionCall).toBeDefined();
			if (!sessionCall) throw new Error("Session call not found");

			const body = sessionCall[1].body;
			expect(body.get("customer")).toBe(customerId);
			expect(body.get("line_items[0][price]")).toBe("price_pro_monthly");
			expect(body.get("line_items[0][quantity]")).toBe("1");
			expect(body.get("mode")).toBe("subscription");
			expect(body.get("allow_promotion_codes")).toBe("true");
			expect(body.get("subscription_data[metadata][tenant_id]")).toBe(tenant.id);
			expect(body.get("subscription_data[metadata][supabase_user_id]")).toBe(user.id);
		});

		it("should use correct success and cancel URLs", async () => {
			const user = createMockUser();
			setupStripeMocks();

			const request = createMockRequest({
				method: "POST",
				body: {
					priceId: "price_test_123",
					userId: user.id,
					email: user.email,
				},
				headers: { origin: "https://myapp.com" },
			});
			const locals = createMockLocals({ user });

			const { POST } = await import("./+server");
			await POST({ request, locals } as never);

			const sessionCall = mockFetch.mock.calls.find((call) =>
				call[0].includes("/v1/checkout/sessions")
			);
			if (!sessionCall) throw new Error("Session call not found");
			const body = sessionCall[1].body;

			expect(body.get("success_url")).toContain("/api/stripe/success");
			expect(body.get("success_url")).toContain("{CHECKOUT_SESSION_ID}");
			expect(body.get("cancel_url")).toContain("/billing");
		});

		it("should return checkout URL on success", async () => {
			const user = createMockUser();
			const expectedUrl = "https://checkout.stripe.com/pay/cs_test_unique";
			setupStripeMocks({ sessionUrl: expectedUrl });

			const request = createMockRequest({
				method: "POST",
				body: {
					priceId: "price_test_123",
					userId: user.id,
					email: user.email,
				},
			});
			const locals = createMockLocals({ user });

			const { POST } = await import("./+server");
			const response = await POST({ request, locals } as never);

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.url).toBe(expectedUrl);
		});
	});

	describe("Error Handling", () => {
		it("should return 500 when customer creation fails", async () => {
			const user = createMockUser();
			setupStripeMocks({ customerSuccess: false });

			const request = createMockRequest({
				method: "POST",
				body: {
					priceId: "price_test_123",
					userId: user.id,
					email: user.email,
				},
			});
			const locals = createMockLocals({ user });

			const { POST } = await import("./+server");
			const response = await POST({ request, locals } as never);

			expect(response.status).toBe(500);
			const body = await response.json();
			expect(body.error).toBe("Customer creation failed");
		});

		it("should return 500 when session creation fails", async () => {
			const user = createMockUser();
			setupStripeMocks({ customerSuccess: true, sessionSuccess: false });

			const request = createMockRequest({
				method: "POST",
				body: {
					priceId: "price_test_123",
					userId: user.id,
					email: user.email,
				},
			});
			const locals = createMockLocals({ user });

			const { POST } = await import("./+server");
			const response = await POST({ request, locals } as never);

			expect(response.status).toBe(500);
			const body = await response.json();
			expect(body.error).toBe("Session creation failed");
		});

		it("should handle network errors gracefully", async () => {
			const user = createMockUser();
			mockFetch.mockRejectedValue(new Error("Network error"));

			const request = createMockRequest({
				method: "POST",
				body: {
					priceId: "price_test_123",
					userId: user.id,
					email: user.email,
				},
			});
			const locals = createMockLocals({ user });

			const { POST } = await import("./+server");
			const response = await POST({ request, locals } as never);

			expect(response.status).toBe(500);
			const body = await response.json();
			expect(body.error).toBe("Network error");
		});

		it("should handle non-Error exceptions", async () => {
			const user = createMockUser();
			mockFetch.mockRejectedValue("String error");

			const request = createMockRequest({
				method: "POST",
				body: {
					priceId: "price_test_123",
					userId: user.id,
					email: user.email,
				},
			});
			const locals = createMockLocals({ user });

			const { POST } = await import("./+server");
			const response = await POST({ request, locals } as never);

			expect(response.status).toBe(500);
			const body = await response.json();
			expect(body.error).toBe("Payment setup failed");
		});
	});

	describe("Security", () => {
		it("should include authorization header in all Stripe requests", async () => {
			const user = createMockUser();
			setupStripeMocks();

			const request = createMockRequest({
				method: "POST",
				body: {
					priceId: "price_test_123",
					userId: user.id,
					email: user.email,
				},
			});
			const locals = createMockLocals({ user });

			const { POST } = await import("./+server");
			await POST({ request, locals } as never);

			mockFetch.mock.calls.forEach((call) => {
				expect(call[1].headers.Authorization).toBe("Bearer sk_test_mock_key");
			});
		});
	});
});
