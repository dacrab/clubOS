/**
 * Onboarding Complete API Endpoint Tests
 * 
 * Tests the POST /api/onboarding/complete endpoint which:
 * - Creates tenant, facility, and membership for new users
 * - Creates trial subscription by default
 * - Handles existing tenant members gracefully
 * - Validates required fields
 * - Handles database errors
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	createMockUser,
	createMockTenant,
	createMockMembership,
	createMockLocals,
	createMockRequest,
	generateId,
	resetIdCounter,
} from "$lib/testing/mocks";

// Mock the supabase-admin module
const mockSupabaseAdmin = {
	from: vi.fn(),
};

vi.mock("$lib/server/supabase-admin", () => ({
	getSupabaseAdmin: () => mockSupabaseAdmin,
}));

// Import after mocking
const { POST } = await import("./+server");

describe("POST /api/onboarding/complete", () => {
	beforeEach(() => {
		resetIdCounter();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Authentication", () => {
		it("should return 401 when user is not authenticated", async () => {
			const request = createMockRequest({
				method: "POST",
				body: { tenant: { name: "Test" }, facility: { name: "Main" } },
			});
			const locals = createMockLocals();
			locals.user = null;

			const response = await POST({ request, locals } as never);

			expect(response.status).toBe(401);
			const body = await response.json();
			expect(body.error).toBe("Unauthorized");
		});
	});

	describe("Validation", () => {
		it("should return 400 when tenant name is missing", async () => {
			const user = createMockUser();
			const request = createMockRequest({
				method: "POST",
				body: { tenant: {}, facility: { name: "Main" } },
			});
			const locals = createMockLocals({ user });

			const response = await POST({ request, locals } as never);

			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error).toBe("Missing required fields");
		});

		it("should return 400 when facility name is missing", async () => {
			const user = createMockUser();
			const request = createMockRequest({
				method: "POST",
				body: { tenant: { name: "Test Club" }, facility: {} },
			});
			const locals = createMockLocals({ user });

			const response = await POST({ request, locals } as never);

			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error).toBe("Missing required fields");
		});

		it("should return 400 when both tenant and facility are missing", async () => {
			const user = createMockUser();
			const request = createMockRequest({
				method: "POST",
				body: {},
			});
			const locals = createMockLocals({ user });

			const response = await POST({ request, locals } as never);

			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error).toBe("Missing required fields");
		});
	});

	describe("Existing Tenant Member", () => {
		it("should return existing tenant ID if user already has membership", async () => {
			const user = createMockUser();
			const tenant = createMockTenant();
			const membership = createMockMembership(user.id, tenant.id, { role: "owner" });

			const request = createMockRequest({
				method: "POST",
				body: { tenant: { name: "New Tenant" }, facility: { name: "Main" } },
			});
			const locals = createMockLocals({
				user,
				memberships: [membership],
				tenants: [tenant],
			});

			const response = await POST({ request, locals } as never);

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.success).toBe(true);
			expect(body.tenantId).toBe(tenant.id);
		});
	});

	describe("New Tenant Creation", () => {
		it("should create tenant, facility, membership, and trial subscription", async () => {
			const user = createMockUser();
			const newTenantId = generateId();
			const newFacilityId = generateId();

			const request = createMockRequest({
				method: "POST",
				body: {
					tenant: { name: "My Club", slug: "my-club" },
					facility: { name: "Main Facility", address: "123 Test St" },
				},
			});
			const locals = createMockLocals({ user });

			// Mock admin client responses
			mockSupabaseAdmin.from.mockImplementation((table: string) => {
				if (table === "tenants") {
					return {
						insert: vi.fn().mockReturnValue({
							select: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({
									data: { id: newTenantId, name: "My Club", slug: "my-club" },
									error: null,
								}),
							}),
						}),
					};
				}
				if (table === "facilities") {
					return {
						insert: vi.fn().mockReturnValue({
							select: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({
									data: { id: newFacilityId, tenant_id: newTenantId, name: "Main Facility" },
									error: null,
								}),
							}),
						}),
					};
				}
				if (table === "memberships") {
					return {
						insert: vi.fn().mockResolvedValue({ error: null }),
					};
				}
				if (table === "subscriptions") {
					return {
						insert: vi.fn().mockResolvedValue({ error: null }),
					};
				}
				return {};
			});

			const response = await POST({ request, locals } as never);

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.success).toBe(true);
			expect(body.tenant.id).toBe(newTenantId);
			expect(body.facility.id).toBe(newFacilityId);
		});

		it("should create tenant without trial when createTrial is false", async () => {
			const user = createMockUser();
			const newTenantId = generateId();
			const newFacilityId = generateId();

			const request = createMockRequest({
				method: "POST",
				body: {
					tenant: { name: "My Club", slug: "my-club" },
					facility: { name: "Main Facility" },
					createTrial: false,
				},
			});
			const locals = createMockLocals({ user });

			const subscriptionInsert = vi.fn().mockResolvedValue({ error: null });

			mockSupabaseAdmin.from.mockImplementation((table: string) => {
				if (table === "tenants") {
					return {
						insert: vi.fn().mockReturnValue({
							select: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({
									data: { id: newTenantId },
									error: null,
								}),
							}),
						}),
					};
				}
				if (table === "facilities") {
					return {
						insert: vi.fn().mockReturnValue({
							select: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({
									data: { id: newFacilityId },
									error: null,
								}),
							}),
						}),
					};
				}
				if (table === "memberships") {
					return { insert: vi.fn().mockResolvedValue({ error: null }) };
				}
				if (table === "subscriptions") {
					return { insert: subscriptionInsert };
				}
				return {};
			});

			await POST({ request, locals } as never);

			expect(subscriptionInsert).not.toHaveBeenCalled();
		});
	});

	describe("Error Handling", () => {
		it("should return 500 when tenant creation fails", async () => {
			const user = createMockUser();

			const request = createMockRequest({
				method: "POST",
				body: {
					tenant: { name: "My Club", slug: "my-club" },
					facility: { name: "Main Facility" },
				},
			});
			const locals = createMockLocals({ user });

			mockSupabaseAdmin.from.mockImplementation((table: string) => {
				if (table === "tenants") {
					return {
						insert: vi.fn().mockReturnValue({
							select: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({
									data: null,
									error: { message: "Duplicate slug", code: "23505" },
								}),
							}),
						}),
					};
				}
				return {};
			});

			const response = await POST({ request, locals } as never);

			expect(response.status).toBe(500);
			const body = await response.json();
			// Error is thrown which becomes generic message or the specific error
			expect(body.error).toMatch(/Duplicate slug|Failed to complete onboarding/);
		});

		it("should return 500 when facility creation fails", async () => {
			const user = createMockUser();
			const newTenantId = generateId();

			const request = createMockRequest({
				method: "POST",
				body: {
					tenant: { name: "My Club", slug: "my-club" },
					facility: { name: "Main Facility" },
				},
			});
			const locals = createMockLocals({ user });

			mockSupabaseAdmin.from.mockImplementation((table: string) => {
				if (table === "tenants") {
					return {
						insert: vi.fn().mockReturnValue({
							select: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({
									data: { id: newTenantId },
									error: null,
								}),
							}),
						}),
					};
				}
				if (table === "facilities") {
					return {
						insert: vi.fn().mockReturnValue({
							select: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({
									data: null,
									error: { message: "Constraint violation" },
								}),
							}),
						}),
					};
				}
				return {};
			});

			const response = await POST({ request, locals } as never);

			expect(response.status).toBe(500);
			const body = await response.json();
			expect(body.error).toMatch(/Constraint violation|Failed to complete onboarding/);
		});

		it("should return 500 when membership creation fails", async () => {
			const user = createMockUser();
			const newTenantId = generateId();
			const newFacilityId = generateId();

			const request = createMockRequest({
				method: "POST",
				body: {
					tenant: { name: "My Club", slug: "my-club" },
					facility: { name: "Main Facility" },
				},
			});
			const locals = createMockLocals({ user });

			mockSupabaseAdmin.from.mockImplementation((table: string) => {
				if (table === "tenants") {
					return {
						insert: vi.fn().mockReturnValue({
							select: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({
									data: { id: newTenantId },
									error: null,
								}),
							}),
						}),
					};
				}
				if (table === "facilities") {
					return {
						insert: vi.fn().mockReturnValue({
							select: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({
									data: { id: newFacilityId },
									error: null,
								}),
							}),
						}),
					};
				}
				if (table === "memberships") {
					return {
						insert: vi.fn().mockResolvedValue({
							error: { message: "RLS policy violation" },
						}),
					};
				}
				return {};
			});

			const response = await POST({ request, locals } as never);

			expect(response.status).toBe(500);
			const body = await response.json();
			expect(body.error).toMatch(/RLS policy violation|Failed to complete onboarding/);
		});

		it("should handle non-Error exceptions gracefully", async () => {
			const user = createMockUser();

			const request = createMockRequest({
				method: "POST",
				body: {
					tenant: { name: "My Club", slug: "my-club" },
					facility: { name: "Main Facility" },
				},
			});
			const locals = createMockLocals({ user });

			mockSupabaseAdmin.from.mockImplementation(() => {
				throw "String error"; // Non-Error exception
			});

			const response = await POST({ request, locals } as never);

			expect(response.status).toBe(500);
			const body = await response.json();
			expect(body.error).toBe("Failed to complete onboarding");
		});
	});

	describe("Data Integrity", () => {
		it("should set correct membership role as owner", async () => {
			const user = createMockUser();
			const newTenantId = generateId();
			const newFacilityId = generateId();

			const request = createMockRequest({
				method: "POST",
				body: {
					tenant: { name: "My Club", slug: "my-club" },
					facility: { name: "Main Facility" },
				},
			});
			const locals = createMockLocals({ user });

			const membershipInsert = vi.fn().mockResolvedValue({ error: null });

			mockSupabaseAdmin.from.mockImplementation((table: string) => {
				if (table === "tenants") {
					return {
						insert: vi.fn().mockReturnValue({
							select: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({
									data: { id: newTenantId },
									error: null,
								}),
							}),
						}),
					};
				}
				if (table === "facilities") {
					return {
						insert: vi.fn().mockReturnValue({
							select: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({
									data: { id: newFacilityId },
									error: null,
								}),
							}),
						}),
					};
				}
				if (table === "memberships") {
					return { insert: membershipInsert };
				}
				if (table === "subscriptions") {
					return { insert: vi.fn().mockResolvedValue({ error: null }) };
				}
				return {};
			});

			await POST({ request, locals } as never);

			expect(membershipInsert).toHaveBeenCalledWith(
				expect.objectContaining({
					user_id: user.id,
					tenant_id: newTenantId,
					facility_id: null,
					role: "owner",
					is_primary: true,
				})
			);
		});

		it("should set 14-day trial period", async () => {
			const user = createMockUser();
			const newTenantId = generateId();
			const newFacilityId = generateId();

			const request = createMockRequest({
				method: "POST",
				body: {
					tenant: { name: "My Club", slug: "my-club" },
					facility: { name: "Main Facility" },
				},
			});
			const locals = createMockLocals({ user });

			const subscriptionInsert = vi.fn().mockResolvedValue({ error: null });

			mockSupabaseAdmin.from.mockImplementation((table: string) => {
				if (table === "tenants") {
					return {
						insert: vi.fn().mockReturnValue({
							select: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({
									data: { id: newTenantId },
									error: null,
								}),
							}),
						}),
					};
				}
				if (table === "facilities") {
					return {
						insert: vi.fn().mockReturnValue({
							select: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({
									data: { id: newFacilityId },
									error: null,
								}),
							}),
						}),
					};
				}
				if (table === "memberships") {
					return { insert: vi.fn().mockResolvedValue({ error: null }) };
				}
				if (table === "subscriptions") {
					return { insert: subscriptionInsert };
				}
				return {};
			});

			await POST({ request, locals } as never);

			expect(subscriptionInsert).toHaveBeenCalledWith(
				expect.objectContaining({
					tenant_id: newTenantId,
					status: "trialing",
					plan_name: "Trial",
				})
			);

			// Verify trial_end is approximately 14 days from now
			const call = subscriptionInsert.mock.calls[0][0];
			const trialEnd = new Date(call.trial_end);
			const now = new Date();
			const daysDiff = Math.round((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
			expect(daysDiff).toBe(14);
		});
	});
});
