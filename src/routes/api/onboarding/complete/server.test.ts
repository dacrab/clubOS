import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	createMockLocals,
	createMockMembership,
	createMockRequest,
	createMockTenant,
	createMockUser,
	generateId,
} from "$lib/testing/mocks";

const mockAdmin = { from: vi.fn() };
vi.mock("$lib/server/supabase-admin", () => ({ getSupabaseAdmin: () => mockAdmin }));

const { POST } = await import("./+server");

type PostArgs = Parameters<typeof POST>[0];

describe("POST /api/onboarding/complete", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const req = (
		body: object,
		user = createMockUser(),
	): { request: Request; locals: ReturnType<typeof createMockLocals> } => ({
		request: createMockRequest({ method: "POST", body }),
		locals: createMockLocals({ user }),
	});

	const mockTables = (overrides: Record<string, object> = {}): { tenantId: string } => {
		const tenantId = generateId();
		const facilityId = generateId();
		const defaults: Record<string, object> = {
			tenants: {
				insert: () => ({
					select: () => ({
						single: () => Promise.resolve({ data: { id: tenantId }, error: null }),
					}),
				}),
			},
			facilities: { insert: () => Promise.resolve({ data: { id: facilityId }, error: null }) },
			memberships: { insert: () => Promise.resolve({ error: null }) },
			subscriptions: { insert: () => Promise.resolve({ error: null }) },
		};
		mockAdmin.from.mockImplementation((t: string) => ({ ...defaults[t], ...overrides[t] }));
		return { tenantId };
	};

	it("returns existing tenant if user has membership", async () => {
		const user = createMockUser(),
			tenant = createMockTenant();
		const { request } = req({ tenant: { name: "New" }, facility: { name: "Main" } }, user);
		const locals = createMockLocals({
			user,
			memberships: [createMockMembership(user.id, tenant.id, { role: "owner" })],
			tenants: [tenant],
		});
		const response = await POST({ request, locals } as unknown as PostArgs);
		expect(response.status).toBe(200);
		expect((await response.json()).tenantId).toBe(tenant.id);
	});

	it("creates tenant, facility, membership, subscription", async () => {
		const { tenantId } = mockTables();
		const response = await POST(
			req({
				tenant: { name: "Club", slug: "club" },
				facility: { name: "Main" },
			}) as unknown as PostArgs,
		);
		expect(response.status).toBe(200);
		expect((await response.json()).tenantId).toBe(tenantId);
	});

	it("skips subscription when createTrial=false", async () => {
		const subInsert = vi.fn().mockResolvedValue({ error: null });
		mockTables({ subscriptions: { insert: subInsert } });
		await POST(
			req({
				tenant: { name: "Club" },
				facility: { name: "Main" },
				createTrial: false,
			}) as unknown as PostArgs,
		);
		expect(subInsert).not.toHaveBeenCalled();
	});

	it("sets owner role and 14-day trial", async () => {
		const memberInsert = vi.fn().mockResolvedValue({ error: null });
		const subInsert = vi.fn().mockResolvedValue({ error: null });
		mockTables({ memberships: { insert: memberInsert }, subscriptions: { insert: subInsert } });
		await POST(
			req({ tenant: { name: "Club" }, facility: { name: "Main" } }) as unknown as PostArgs,
		);
		expect(memberInsert).toHaveBeenCalledWith(
			expect.objectContaining({ role: "owner", is_primary: true }),
		);
		expect(subInsert).toHaveBeenCalledWith(expect.objectContaining({ status: "trialing" }));
		const trialEnd = new Date(subInsert.mock.calls[0][0].trial_end);
		expect(Math.round((trialEnd.getTime() - Date.now()) / 86_400_000)).toBe(14);
	});

	it("returns 401 when user is not authenticated", async () => {
		const response = await POST({
			request: createMockRequest({
				method: "POST",
				body: { tenant: { name: "Club" }, facility: { name: "Main" } },
			}),
			locals: createMockLocals({}),
		} as unknown as PostArgs);
		expect(response.status).toBe(401);
		expect((await response.json()).error).toBe("Unauthorized");
	});

	it("returns 400 when tenant.name is missing", async () => {
		const response = await POST(
			req({ tenant: { slug: "club" }, facility: { name: "Main" } }) as unknown as PostArgs,
		);
		expect(response.status).toBe(400);
		expect((await response.json()).error).toBe("Missing required fields");
	});

	it("returns 400 when facility.name is missing", async () => {
		const response = await POST(
			req({
				tenant: { name: "Club" },
				facility: { address: "123 Main St" },
			}) as unknown as PostArgs,
		);
		expect(response.status).toBe(400);
		expect((await response.json()).error).toBe("Missing required fields");
	});

	it("returns 500 when tenant creation fails", async () => {
		mockTables({
			tenants: {
				insert: () => ({
					select: () => ({
						single: () => Promise.resolve({ data: null, error: { message: "Database error" } }),
					}),
				}),
			},
		});
		const response = await POST(
			req({ tenant: { name: "Club" }, facility: { name: "Main" } }) as unknown as PostArgs,
		);
		expect(response.status).toBe(500);
		expect((await response.json()).error).toBeDefined();
	});

	it("returns 500 when facility creation fails", async () => {
		mockTables({
			facilities: {
				insert: () => Promise.resolve({ data: null, error: { message: "Facility error" } }),
			},
		});
		const response = await POST(
			req({
				tenant: { name: "Club", slug: "club" },
				facility: { name: "Main" },
			}) as unknown as PostArgs,
		);
		expect(response.status).toBe(500);
		expect((await response.json()).error).toBeDefined();
	});

	it("returns 500 when membership creation fails", async () => {
		mockTables({
			memberships: { insert: () => Promise.resolve({ error: { message: "Membership error" } }) },
		});
		const response = await POST(
			req({
				tenant: { name: "Club", slug: "club" },
				facility: { name: "Main" },
			}) as unknown as PostArgs,
		);
		expect(response.status).toBe(500);
		expect((await response.json()).error).toBeDefined();
	});
});
