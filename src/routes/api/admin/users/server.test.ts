import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreateUser = vi.fn(), mockDeleteUser = vi.fn();
const mockInsert = vi.fn();
const mockMembershipSelect = vi.fn();

vi.mock("$lib/server/supabase-admin", () => ({
	getSupabaseAdmin: () => ({
		auth: { admin: { createUser: mockCreateUser, deleteUser: mockDeleteUser } },
		from: (t: string) => t === "memberships"
			? { select: () => ({ eq: () => ({ eq: () => ({ single: mockMembershipSelect }) }) }), insert: mockInsert }
			: { insert: mockInsert },
	}),
}));

import { POST } from "./+server";

const json = (body: object) => new Request("http://localhost", { method: "POST", body: JSON.stringify(body) });
const adminLocals = { user: { id: "u1" } } as App.Locals;

beforeEach(() => { vi.clearAllMocks(); mockMembershipSelect.mockResolvedValue({ data: { tenant_id: "t1", role: "owner" } }); });

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
});
