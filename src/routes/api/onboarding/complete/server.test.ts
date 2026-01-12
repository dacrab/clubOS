import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockUser, createMockTenant, createMockMembership, createMockLocals, createMockRequest, generateId, resetIdCounter } from "$lib/testing/mocks";

const mockAdmin = { from: vi.fn() };
vi.mock("$lib/server/supabase-admin", () => ({ getSupabaseAdmin: () => mockAdmin }));

const { POST } = await import("./+server");

describe("POST /api/onboarding/complete", () => {
	beforeEach(() => { resetIdCounter(); vi.clearAllMocks(); });

	const req = (body: object, user = createMockUser()) => ({
		request: createMockRequest({ method: "POST", body }),
		locals: createMockLocals({ user }),
	});

	const mockTables = (overrides: Record<string, unknown> = {}) => {
		const tenantId = generateId(), facilityId = generateId();
		const defaults: Record<string, unknown> = {
			tenants: { insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: tenantId }, error: null }) }) }) },
			facilities: { insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: facilityId }, error: null }) }) }) },
			memberships: { insert: () => Promise.resolve({ error: null }) },
			subscriptions: { insert: () => Promise.resolve({ error: null }) },
		};
		mockAdmin.from.mockImplementation((t: string) => ({ ...defaults[t], ...overrides[t] }));
		return { tenantId, facilityId };
	};

	it("returns 401 when not authenticated", async () => {
		const { request } = req({ tenant: { name: "Test" }, facility: { name: "Main" } });
		const response = await POST({ request, locals: createMockLocals() } as never);
		expect(response.status).toBe(401);
	});

	it.each([
		[{}, "both missing"],
		[{ tenant: {} }, "tenant name missing"],
		[{ facility: {} }, "facility name missing"],
		[{ tenant: { name: "X" } }, "facility missing"],
		[{ facility: { name: "X" } }, "tenant missing"],
	])("returns 400 for invalid body: %s", async (body) => {
		const response = await POST(req(body) as never);
		expect(response.status).toBe(400);
	});

	it("returns existing tenant if user has membership", async () => {
		const user = createMockUser(), tenant = createMockTenant();
		const { request } = req({ tenant: { name: "New" }, facility: { name: "Main" } }, user);
		const locals = createMockLocals({ user, memberships: [createMockMembership(user.id, tenant.id, { role: "owner" })], tenants: [tenant] });
		const response = await POST({ request, locals } as never);
		expect(response.status).toBe(200);
		expect((await response.json()).tenantId).toBe(tenant.id);
	});

	it("creates tenant, facility, membership, subscription", async () => {
		const { tenantId, facilityId } = mockTables();
		const response = await POST(req({ tenant: { name: "Club", slug: "club" }, facility: { name: "Main" } }) as never);
		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.tenant.id).toBe(tenantId);
		expect(body.facility.id).toBe(facilityId);
	});

	it("skips subscription when createTrial=false", async () => {
		const subInsert = vi.fn().mockResolvedValue({ error: null });
		mockTables({ subscriptions: { insert: subInsert } });
		await POST(req({ tenant: { name: "Club" }, facility: { name: "Main" }, createTrial: false }) as never);
		expect(subInsert).not.toHaveBeenCalled();
	});

	it.each([
		["tenants", { insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: { message: "Duplicate" } }) }) }) }],
		["facilities", { insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: { message: "Error" } }) }) }) }],
		["memberships", { insert: () => Promise.resolve({ error: { message: "RLS" } }) }],
	])("returns 500 when %s fails", async (table, mock) => {
		mockTables({ [table]: mock });
		const response = await POST(req({ tenant: { name: "Club" }, facility: { name: "Main" } }) as never);
		expect(response.status).toBe(500);
	});

	it("sets owner role and 14-day trial", async () => {
		const memberInsert = vi.fn().mockResolvedValue({ error: null });
		const subInsert = vi.fn().mockResolvedValue({ error: null });
		mockTables({ memberships: { insert: memberInsert }, subscriptions: { insert: subInsert } });
		const user = createMockUser();
		await POST(req({ tenant: { name: "Club" }, facility: { name: "Main" } }, user) as never);
		
		expect(memberInsert).toHaveBeenCalledWith(expect.objectContaining({ role: "owner", is_primary: true }));
		expect(subInsert).toHaveBeenCalledWith(expect.objectContaining({ status: "trialing" }));
		const trialEnd = new Date(subInsert.mock.calls[0][0].trial_end);
		expect(Math.round((trialEnd.getTime() - Date.now()) / 86400000)).toBe(14);
	});
});
