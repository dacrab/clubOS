import { beforeEach, describe, expect, it, vi } from "vitest";

const qb = vi.hoisted(() => ({
	insert: vi.fn(),
	update: vi.fn(),
	select: vi.fn(),
}));

const { mockClerkCreateUser, mockClerkDeleteUser, mockClerkUpdateUser } = vi.hoisted(() => ({
	mockClerkCreateUser: vi.fn(),
	mockClerkDeleteUser: vi.fn(),
	mockClerkUpdateUser: vi.fn(),
}));

vi.mock("svelte-clerk/server", () => ({
	clerkClient: {
		users: {
			createUser: mockClerkCreateUser,
			deleteUser: mockClerkDeleteUser,
			updateUser: mockClerkUpdateUser,
		},
	},
}));

vi.mock("$lib/db/client", () => ({ getDb: () => qb }));

import { DELETE, POST, PUT } from "./+server";

const json = (body: object, method = "POST"): Request =>
	new Request("http://localhost", { method, body: JSON.stringify(body) });

const adminLocals = { userId: "u1" } as Partial<App.Locals> as App.Locals;
const guestLocals = { userId: null } as Partial<App.Locals> as App.Locals;

function mockMembershipRow(role = "owner", tenantId = "t1") {
	qb.select.mockReturnValue({
		from: () => ({
			where: () => ({ limit: () => Promise.resolve([{ tenantId, role }]) }),
		}),
	});
}

function mockNoMembership() {
	qb.select.mockReturnValue({
		from: () => ({
			where: () => ({ limit: () => Promise.resolve([]) }),
		}),
	});
}

beforeEach(() => {
	vi.clearAllMocks();
	mockMembershipRow("owner");
	qb.insert.mockReturnValue({
		values: () => ({ onConflictDoNothing: () => Promise.resolve() }),
	});
	qb.update.mockReturnValue({ set: () => ({ where: () => Promise.resolve() }) });
});

describe("POST /api/admin/users", () => {
	it("creates user and membership", async () => {
		mockClerkCreateUser.mockResolvedValueOnce({ id: "new1" });
		const res = await POST({
			request: json({ email: "x@x.com", password: "pass123", role: "staff", full_name: "Test" }),
			locals: adminLocals,
		} as Parameters<typeof POST>[0]);
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ id: "new1" });
		expect(mockClerkCreateUser).toHaveBeenCalledWith(
			expect.objectContaining({ emailAddress: ["x@x.com"], password: "pass123" }),
		);
	});

	it("returns 400 with missing fields", async () => {
		const res = await POST({
			request: json({ email: "x@x.com", password: "pass123" }),
			locals: adminLocals,
		} as Parameters<typeof POST>[0]);
		expect(res.status).toBe(400);
		expect(mockClerkCreateUser).not.toHaveBeenCalled();
	});

	it("returns 401 when not authenticated", async () => {
		const res = await POST({
			request: json({ email: "x@x.com", password: "pass123", role: "staff", full_name: "Test" }),
			locals: guestLocals,
		} as Parameters<typeof POST>[0]);
		expect(res.status).toBe(401);
	});
});

describe("POST role hierarchy", () => {
	it("prevents admin caller from creating owner", async () => {
		mockMembershipRow("admin");
		const res = await POST({
			request: json({ email: "x@x.com", password: "pass123", role: "owner", full_name: "Admin" }),
			locals: adminLocals,
		} as Parameters<typeof POST>[0]);
		expect(res.status).toBe(403);
		expect(mockClerkCreateUser).not.toHaveBeenCalled();
	});

	it("prevents staff caller from creating any user", async () => {
		mockMembershipRow("staff");
		const res = await POST({
			request: json({ email: "x@x.com", password: "pass123", role: "staff", full_name: "Test" }),
			locals: adminLocals,
		} as Parameters<typeof POST>[0]);
		expect(res.status).toBe(403);
	});

	it("allows owner caller to create owner", async () => {
		mockClerkCreateUser.mockResolvedValueOnce({ id: "new1" });
		const res = await POST({
			request: json({ email: "x@x.com", password: "pass123", role: "owner", full_name: "Owner" }),
			locals: adminLocals,
		} as Parameters<typeof POST>[0]);
		expect(res.status).toBe(200);
	});
});

describe("PUT /api/admin/users", () => {
	it("updates user and role", async () => {
		const res = await PUT({
			request: json({ id: "u2", full_name: "Updated", role: "manager" }, "PUT"),
			locals: adminLocals,
		} as Parameters<typeof POST>[0]);
		expect(res.status).toBe(204);
	});

	it("returns 400 when id is missing", async () => {
		const res = await PUT({
			request: json({ full_name: "Updated" }, "PUT"),
			locals: adminLocals,
		} as Parameters<typeof POST>[0]);
		expect(res.status).toBe(400);
	});

	it("returns 401 when not authenticated", async () => {
		const res = await PUT({
			request: json({ id: "u2", full_name: "Updated" }, "PUT"),
			locals: guestLocals,
		} as Parameters<typeof POST>[0]);
		expect(res.status).toBe(401);
	});
});

describe("DELETE /api/admin/users", () => {
	it("deletes user", async () => {
		mockClerkDeleteUser.mockResolvedValueOnce({ errors: undefined });
		const res = await DELETE({
			request: json({ id: "u2" }, "DELETE"),
			locals: adminLocals,
		} as Parameters<typeof POST>[0]);
		expect(res.status).toBe(204);
		expect(mockClerkDeleteUser).toHaveBeenCalledWith("u2");
	});

	it("returns 403 when caller has no membership", async () => {
		mockNoMembership();
		const res = await DELETE({
			request: json({ id: "u2" }, "DELETE"),
			locals: adminLocals,
		} as Parameters<typeof POST>[0]);
		expect(res.status).toBe(403);
		expect(mockClerkDeleteUser).not.toHaveBeenCalled();
	});

	it("returns 400 when id is missing", async () => {
		const res = await DELETE({
			request: json({}, "DELETE"),
			locals: adminLocals,
		} as Parameters<typeof POST>[0]);
		expect(res.status).toBe(400);
	});

	it("returns 401 when not authenticated", async () => {
		const res = await DELETE({
			request: json({ id: "u2" }, "DELETE"),
			locals: guestLocals,
		} as Parameters<typeof POST>[0]);
		expect(res.status).toBe(401);
	});
});
