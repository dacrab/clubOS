import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MockUser } from "$lib/testing/mocks";
import {
	createMockLocals,
	createMockRequest,
	createMockUser,
	generateId,
} from "$lib/testing/mocks";

const qb = vi.hoisted(() => ({
	insert: vi.fn(),
	select: vi.fn(),
}));

vi.mock("$lib/db/client", () => ({
	getDb: () => ({ insert: qb.insert, select: qb.select }),
}));

vi.mock("$lib/db/schema/tenants", () => ({ tenants: {} }));
vi.mock("$lib/db/schema/facilities", () => ({ facilities: {} }));
vi.mock("$lib/db/schema/memberships", () => ({ memberships: {} }));
vi.mock("$lib/db/schema/subscriptions", () => ({ subscriptions: {} }));

const { POST } = await import("./+server");

const PostHandler = POST as unknown as (args: {
	request: Request;
	locals: Record<string, unknown>;
}) => Promise<Response>;

function makeReq(body: object, user?: MockUser) {
	return {
		request: createMockRequest({ method: "POST", body }),
		locals: createMockLocals({ user }),
	};
}

function selectMock(result: unknown) {
	qb.select.mockReturnValue({
		from: () => ({ where: () => ({ limit: () => Promise.resolve(result as never[]) }) }),
	});
}

function insertMock(id: string) {
	qb.insert.mockReturnValue({
		values: () => ({ returning: vi.fn().mockResolvedValue([{ id }]) }),
	});
}

describe("POST /api/onboarding/complete", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns existing tenant if user has membership", async () => {
		const tenantId = generateId();
		selectMock([{ tenantId }]);
		const res = await PostHandler(
			makeReq({ tenant: { name: "New" }, facility: { name: "Main" } }, createMockUser()),
		);
		expect(res.status).toBe(200);
		expect((await res.json()).tenantId).toBe(tenantId);
	});

	it("creates tenant, facility, membership, subscription", async () => {
		const tenantId = generateId();
		selectMock([]);
		insertMock(tenantId);
		const res = await PostHandler(
			makeReq({ tenant: { name: "Club" }, facility: { name: "Main" } }, createMockUser()),
		);
		expect(res.status).toBe(200);
		expect((await res.json()).tenantId).toBe(tenantId);
	});

	it("returns 401 when not authenticated", async () => {
		const res = await PostHandler(
			makeReq({ tenant: { name: "Club" }, facility: { name: "Main" } }),
		);
		expect(res.status).toBe(401);
		expect((await res.json()).error).toBe("Unauthorized");
	});

	it("returns 400 when tenant.name is missing", async () => {
		const res = await PostHandler(
			makeReq({ tenant: { slug: "club" }, facility: { name: "Main" } }, createMockUser()),
		);
		expect(res.status).toBe(400);
		expect((await res.json()).error).toBe("Missing required fields");
	});

	it("returns 400 when facility.name is missing", async () => {
		const res = await PostHandler(
			makeReq({ tenant: { name: "Club" }, facility: {} }, createMockUser()),
		);
		expect(res.status).toBe(400);
		expect((await res.json()).error).toBe("Missing required fields");
	});

	it("does not create a duplicate when user already has membership", async () => {
		const tenantId = generateId();
		selectMock([{ tenantId }]);
		const res = await PostHandler(
			makeReq({ tenant: { name: "New" }, facility: { name: "Main" } }, createMockUser()),
		);
		expect(res.status).toBe(200);
		expect((await res.json()).tenantId).toBe(tenantId);
		expect(qb.insert).not.toHaveBeenCalled();
	});
});
