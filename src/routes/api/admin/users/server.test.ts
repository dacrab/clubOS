import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreateUser = vi.fn(), mockDeleteUser = vi.fn(), mockUpdateUserById = vi.fn();
const mockInsert = vi.fn(), mockUpdate = vi.fn();
const mockMembershipSelect = vi.fn();

vi.mock("$lib/server/supabase-admin", () => ({
	getSupabaseAdmin: () => ({
		auth: { admin: { createUser: mockCreateUser, deleteUser: mockDeleteUser, updateUserById: mockUpdateUserById } },
		from: (t: string) => t === "memberships"
			? { select: () => ({ eq: () => ({ eq: () => ({ single: mockMembershipSelect }) }) }), insert: mockInsert, update: () => ({ eq: () => ({ eq: mockUpdate }) }) }
			: { insert: mockInsert, update: () => ({ eq: mockUpdate }) },
	}),
}));

import { POST, PUT, DELETE } from "./+server";

const json = (body: object) => new Request("http://localhost", { method: "POST", body: JSON.stringify(body) });
const adminLocals = { user: { id: "u1" } } as App.Locals;

beforeEach(() => {
	vi.clearAllMocks();
	mockMembershipSelect.mockResolvedValue({ data: { tenant_id: "t1", role: "owner" } });
});

describe("POST /api/admin/users", () => {
	it("returns 401 without user", async () => {
		const res = await POST({ request: json({}), locals: {} } as never);
		expect(res.status).toBe(401);
	});

	it("returns 403 for non-admin", async () => {
		mockMembershipSelect.mockResolvedValueOnce({ data: { role: "staff" } });
		const res = await POST({ request: json({}), locals: adminLocals } as never);
		expect(res.status).toBe(403);
	});

	it("returns 400 for missing fields", async () => {
		const res = await POST({ request: json({ email: "x@x.com" }), locals: adminLocals } as never);
		expect(res.status).toBe(400);
	});

	it("creates user and membership", async () => {
		mockCreateUser.mockResolvedValueOnce({ data: { user: { id: "new1" } }, error: null });
		mockInsert.mockResolvedValueOnce({ error: null });
		const res = await POST({ request: json({ email: "x@x.com", password: "pass", role: "staff", full_name: "Test" }), locals: adminLocals } as never);
		expect(res.status).toBe(200);
		expect(mockCreateUser).toHaveBeenCalled();
		expect(mockInsert).toHaveBeenCalled();
	});

	it("rolls back on membership error", async () => {
		mockCreateUser.mockResolvedValueOnce({ data: { user: { id: "new1" } }, error: null });
		mockInsert.mockResolvedValueOnce({ error: { message: "Duplicate" } });
		const res = await POST({ request: json({ email: "x@x.com", password: "pass", role: "staff", full_name: "Test" }), locals: adminLocals } as never);
		expect(res.status).toBe(400);
		expect(mockDeleteUser).toHaveBeenCalledWith("new1");
	});
});

describe("PUT /api/admin/users", () => {
	it("returns 400 without id", async () => {
		const res = await PUT({ request: json({}), locals: adminLocals } as never);
		expect(res.status).toBe(400);
	});

	it("updates user", async () => {
		mockUpdateUserById.mockResolvedValueOnce({ error: null });
		const res = await PUT({ request: json({ id: "u1", full_name: "New", role: "admin" }), locals: adminLocals } as never);
		expect(res.status).toBe(204);
	});
});

describe("DELETE /api/admin/users", () => {
	it("deletes user", async () => {
		mockDeleteUser.mockResolvedValueOnce({ error: null });
		const res = await DELETE({ request: json({ id: "u1" }), locals: adminLocals } as never);
		expect(res.status).toBe(204);
	});
});
