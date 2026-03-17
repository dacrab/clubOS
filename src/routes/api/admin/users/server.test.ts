import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreateUser = vi.fn();
const mockDeleteUser = vi.fn();
const mockUpdateUserById = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockMembershipSelect = vi.fn();
const mockEq = vi.fn();
const mockSecondEq = vi.fn();

vi.mock("$lib/server/supabase-admin", () => ({
	getSupabaseAdmin: () => ({
		auth: { admin: { createUser: mockCreateUser, deleteUser: mockDeleteUser, updateUserById: mockUpdateUserById } },
		from: (t: string) => {
			if (t === "memberships") {
				return {
					select: () => ({ eq: () => ({ eq: () => ({ single: mockMembershipSelect }) }) }),
					insert: mockInsert,
					update: mockUpdate,
				};
			}
			if (t === "users") {
				return { update: mockUpdate };
			}
			return { insert: mockInsert };
		},
	}),
}));

import { POST, PUT, DELETE } from "./+server";

const json = (body: object, method = "POST"): Request => new Request("http://localhost", { method, body: JSON.stringify(body) });
const adminLocals = { user: { id: "u1" } } as App.Locals;
const staffLocals = { user: { id: "u2" } } as App.Locals;

beforeEach(() => {
	vi.clearAllMocks();
	mockMembershipSelect.mockResolvedValue({ data: { tenant_id: "t1", role: "owner" } });
	mockInsert.mockResolvedValue({ error: null });
	mockUpdate.mockReturnValue({ eq: mockEq });
	mockEq.mockReturnValue({ eq: mockSecondEq });
	mockSecondEq.mockResolvedValue({ error: null });
});

describe("POST /api/admin/users", () => {
	it("creates user and membership", async () => {
		mockCreateUser.mockResolvedValueOnce({ data: { user: { id: "new1" } }, error: null });
		mockInsert.mockResolvedValueOnce({ error: null });
		const res = await POST({ request: json({ email: "x@x.com", password: "pass", role: "staff", full_name: "Test" }), locals: adminLocals } as never);
		expect(res.status).toBe(200);
		expect(mockCreateUser).toHaveBeenCalled();
		expect(mockInsert).toHaveBeenCalled();
	});

	it("rolls back auth user on membership error", async () => {
		mockCreateUser.mockResolvedValueOnce({ data: { user: { id: "new1" } }, error: null });
		mockInsert.mockResolvedValueOnce({ error: { message: "Duplicate" } });
		const res = await POST({ request: json({ email: "x@x.com", password: "pass", role: "staff", full_name: "Test" }), locals: adminLocals } as never);
		expect(res.status).toBe(400);
		expect(mockDeleteUser).toHaveBeenCalledWith("new1");
	});

	it("returns 400 with missing fields", async () => {
		const res = await POST({ request: json({ email: "x@x.com", password: "pass" }), locals: adminLocals } as never);
		expect(res.status).toBe(400);
		expect(mockCreateUser).not.toHaveBeenCalled();
	});

	it("returns 401 when user is not authenticated", async () => {
		const unauthLocals = { user: null } as never as App.Locals;
		const res = await POST({ request: json({ email: "x@x.com", password: "pass", role: "staff", full_name: "Test" }), locals: unauthLocals } as never);
		expect(res.status).toBe(401);
		expect(mockCreateUser).not.toHaveBeenCalled();
	});

	it("returns 403 when non-admin (staff role) tries to create user", async () => {
		mockMembershipSelect.mockResolvedValueOnce({ data: { tenant_id: "t1", role: "staff" } });
		const res = await POST({ request: json({ email: "x@x.com", password: "pass", role: "staff", full_name: "Test" }), locals: adminLocals } as never);
		expect(res.status).toBe(403);
		expect(mockCreateUser).not.toHaveBeenCalled();
	});

	it("returns 403 when admin tries to escalate privilege (create owner)", async () => {
		mockMembershipSelect.mockResolvedValueOnce({ data: { tenant_id: "t1", role: "admin" } });
		const res = await POST({ request: json({ email: "x@x.com", password: "pass", role: "owner", full_name: "Test" }), locals: adminLocals } as never);
		expect(res.status).toBe(403);
		expect(mockCreateUser).not.toHaveBeenCalled();
	});
});

describe("PUT /api/admin/users", () => {
	it("updates user metadata and role", async () => {
		mockUpdateUserById.mockResolvedValueOnce({ data: { user: { id: "u2" } }, error: null });
		mockUpdate.mockReturnValueOnce({ eq: mockEq });
		mockEq.mockReturnValueOnce({ eq: mockSecondEq });
		mockSecondEq.mockResolvedValueOnce({ error: null });

		const res = await PUT({ request: json({ id: "u2", full_name: "Updated", role: "manager" }, "PUT"), locals: adminLocals } as never);
		expect(res.status).toBe(204);
		expect(mockUpdateUserById).toHaveBeenCalledWith("u2", expect.objectContaining({ user_metadata: expect.any(Object) }));
	});

	it("returns 400 when id is missing", async () => {
		const res = await PUT({ request: json({ full_name: "Updated" }, "PUT"), locals: adminLocals } as never);
		expect(res.status).toBe(400);
	});

	it("returns 401 when user is not authenticated", async () => {
		const unauthLocals = { user: null } as never as App.Locals;
		const res = await PUT({ request: json({ id: "u2", full_name: "Updated" }, "PUT"), locals: unauthLocals } as never);
		expect(res.status).toBe(401);
	});

	it("returns 403 when admin tries to assign owner role", async () => {
		mockMembershipSelect.mockResolvedValueOnce({ data: { tenant_id: "t1", role: "admin" } });
		const res = await PUT({ request: json({ id: "u2", role: "owner" }, "PUT"), locals: adminLocals } as never);
		expect(res.status).toBe(403);
	});
});

describe("DELETE /api/admin/users", () => {
	it("deletes auth user", async () => {
		mockDeleteUser.mockResolvedValueOnce({ data: { user: { id: "u2" } }, error: null });
		const res = await DELETE({ request: json({ id: "u2" }, "DELETE"), locals: adminLocals } as never);
		expect(res.status).toBe(204);
		expect(mockDeleteUser).toHaveBeenCalledWith("u2");
	});

	it("returns 400 when id is missing", async () => {
		const res = await DELETE({ request: json({}, "DELETE"), locals: adminLocals } as never);
		expect(res.status).toBe(400);
	});

	it("returns 401 when user is not authenticated", async () => {
		const unauthLocals = { user: null } as never as App.Locals;
		const res = await DELETE({ request: json({ id: "u2" }, "DELETE"), locals: unauthLocals } as never);
		expect(res.status).toBe(401);
	});

	it("returns 403 when non-admin tries to delete", async () => {
		mockMembershipSelect.mockResolvedValueOnce({ data: { tenant_id: "t1", role: "staff" } });
		const res = await DELETE({ request: json({ id: "u2" }, "DELETE"), locals: adminLocals } as never);
		expect(res.status).toBe(403);
	});
});
