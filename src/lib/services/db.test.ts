import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("$app/navigation", () => ({ invalidateAll: vi.fn() }));

vi.mock("$lib/utils/supabase", () => ({
	supabase: {
		rpc: vi.fn(),
		from: vi.fn(),
	},
}));

global.fetch = vi.fn();

import { supabase } from "$lib/utils/supabase";
import { invalidateAll } from "$app/navigation";
import { products, categories, registerSessions, users } from "./db";

describe("products", () => {
	beforeEach(() => vi.clearAllMocks());

	it("create inserts data and invalidates on success", async () => {
		const mockInsert = vi.fn().mockResolvedValue({ error: null });
		(supabase.from as any).mockReturnValue({ insert: mockInsert });

		const data = { name: "Test", price: 10, stock_quantity: 5, facility_id: "f1", created_by: "u1" };
		const result = await products.create(data);

		expect(supabase.from).toHaveBeenCalledWith("products");
		expect(mockInsert).toHaveBeenCalledWith(data);
		expect(invalidateAll).toHaveBeenCalled();
		expect(result.error).toBeNull();
	});

	it("create does not invalidate on error", async () => {
		const testError = new Error("Insert failed");
		const mockInsert = vi.fn().mockResolvedValue({ error: testError });
		(supabase.from as any).mockReturnValue({ insert: mockInsert });

		const data = { name: "Test", price: 10, stock_quantity: 5, facility_id: "f1", created_by: "u1" };
		const result = await products.create(data);

		expect(invalidateAll).not.toHaveBeenCalled();
		expect(result.error).toBe(testError);
	});

	it("update updates data with correct id and invalidates on success", async () => {
		const mockEq = vi.fn().mockResolvedValue({ error: null });
		const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
		(supabase.from as any).mockReturnValue({ update: mockUpdate });

		const updateData = { name: "Updated" };
		const result = await products.update("p1", updateData);

		expect(supabase.from).toHaveBeenCalledWith("products");
		expect(mockUpdate).toHaveBeenCalledWith(updateData);
		expect(mockEq).toHaveBeenCalledWith("id", "p1");
		expect(invalidateAll).toHaveBeenCalled();
		expect(result.error).toBeNull();
	});

	it("delete deletes with correct id and invalidates on success", async () => {
		const mockEq = vi.fn().mockResolvedValue({ error: null });
		const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });
		(supabase.from as any).mockReturnValue({ delete: mockDelete });

		const result = await products.remove("p1");

		expect(supabase.from).toHaveBeenCalledWith("products");
		expect(mockDelete).toHaveBeenCalled();
		expect(mockEq).toHaveBeenCalledWith("id", "p1");
		expect(invalidateAll).toHaveBeenCalled();
		expect(result.error).toBeNull();
	});
});

describe("categories", () => {
	beforeEach(() => vi.clearAllMocks());

	it("create inserts data and invalidates on success", async () => {
		const mockInsert = vi.fn().mockResolvedValue({ error: null });
		(supabase.from as any).mockReturnValue({ insert: mockInsert });

		const data = { name: "Test", facility_id: "f1" };
		const result = await categories.create(data);

		expect(supabase.from).toHaveBeenCalledWith("categories");
		expect(mockInsert).toHaveBeenCalledWith(data);
		expect(invalidateAll).toHaveBeenCalled();
		expect(result.error).toBeNull();
	});

	it("update updates with correct id and invalidates on success", async () => {
		const mockEq = vi.fn().mockResolvedValue({ error: null });
		const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
		(supabase.from as any).mockReturnValue({ update: mockUpdate });

		const updateData = { name: "Updated" };
		const result = await categories.update("c1", updateData);

		expect(supabase.from).toHaveBeenCalledWith("categories");
		expect(mockUpdate).toHaveBeenCalledWith(updateData);
		expect(mockEq).toHaveBeenCalledWith("id", "c1");
		expect(invalidateAll).toHaveBeenCalled();
		expect(result.error).toBeNull();
	});

	it("remove deletes with correct id and invalidates on success", async () => {
		const mockEq = vi.fn().mockResolvedValue({ error: null });
		const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });
		(supabase.from as any).mockReturnValue({ delete: mockDelete });

		const result = await categories.remove("c1");

		expect(supabase.from).toHaveBeenCalledWith("categories");
		expect(mockDelete).toHaveBeenCalled();
		expect(mockEq).toHaveBeenCalledWith("id", "c1");
		expect(invalidateAll).toHaveBeenCalled();
		expect(result.error).toBeNull();
	});
});

describe("registerSessions", () => {
	beforeEach(() => vi.clearAllMocks());

	it("open inserts session and invalidates on success", async () => {
		const mockInsert = vi.fn().mockResolvedValue({ error: null });
		(supabase.from as any).mockReturnValue({ insert: mockInsert });

		const result = await registerSessions.open("f1", "u1");

		expect(supabase.from).toHaveBeenCalledWith("register_sessions");
		expect(mockInsert).toHaveBeenCalledWith({ facility_id: "f1", opened_by: "u1" });
		expect(invalidateAll).toHaveBeenCalled();
		expect(result.error).toBeNull();
	});

	it("close calls RPC with correct name and all parameters", async () => {
		(supabase.rpc as any).mockResolvedValue({ error: null });

		const result = await registerSessions.close("s1", "u1", 100, "notes");

		expect(supabase.rpc).toHaveBeenCalledWith("close_register_session", {
			p_session_id: "s1",
			p_user_id: "u1",
			p_closing_cash: 100,
			p_notes: "notes",
		});
		expect(invalidateAll).toHaveBeenCalled();
		expect(result.error).toBeNull();
	});

	it("close converts undefined notes to null", async () => {
		(supabase.rpc as any).mockResolvedValue({ error: null });

		const result = await registerSessions.close("s1", "u1", 100);

		expect(supabase.rpc).toHaveBeenCalledWith("close_register_session", {
			p_session_id: "s1",
			p_user_id: "u1",
			p_closing_cash: 100,
			p_notes: null,
		});
		expect(invalidateAll).toHaveBeenCalled();
		expect(result.error).toBeNull();
	});

	it("close does not invalidate on RPC error", async () => {
		const testError = new Error("RPC failed");
		(supabase.rpc as any).mockResolvedValue({ error: testError });

		const result = await registerSessions.close("s1", "u1", 100, "notes");

		expect(invalidateAll).not.toHaveBeenCalled();
		expect(result.error).toBe(testError);
	});
});

describe("users", () => {
	beforeEach(() => vi.clearAllMocks());

	it("create calls POST with correct endpoint and body", async () => {
		(global.fetch as any).mockResolvedValue({ ok: true, text: vi.fn().mockResolvedValue("") });

		const data = { email: "test@example.com", full_name: "Test", password: "pass", role: "staff" };
		const result = await users.create(data);

		expect(global.fetch).toHaveBeenCalledWith("/api/admin/users", expect.objectContaining({
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		}));
		expect(invalidateAll).toHaveBeenCalled();
		expect(result.error).toBeNull();
	});

	it("update calls PUT with correct endpoint and body including id", async () => {
		(global.fetch as any).mockResolvedValue({ ok: true, text: vi.fn().mockResolvedValue("") });

		const updateData = { full_name: "Updated" };
		const result = await users.update("u1", updateData);

		expect(global.fetch).toHaveBeenCalledWith("/api/admin/users", expect.objectContaining({
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id: "u1", ...updateData }),
		}));
		expect(invalidateAll).toHaveBeenCalled();
		expect(result.error).toBeNull();
	});

	it("remove calls DELETE with correct endpoint and body", async () => {
		(global.fetch as any).mockResolvedValue({ ok: true, text: vi.fn().mockResolvedValue("") });

		const result = await users.remove("u1");

		expect(global.fetch).toHaveBeenCalledWith("/api/admin/users", expect.objectContaining({
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id: "u1" }),
		}));
		expect(invalidateAll).toHaveBeenCalled();
		expect(result.error).toBeNull();
	});

	it("create does not invalidate on API error", async () => {
		(global.fetch as any).mockResolvedValue({ ok: false, text: vi.fn().mockResolvedValue("API error") });

		const data = { email: "test@example.com", full_name: "Test", password: "pass", role: "staff" };
		const result = await users.create(data);

		expect(invalidateAll).not.toHaveBeenCalled();
		expect(result.error).toBe("API error");
	});
});
