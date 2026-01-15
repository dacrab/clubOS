import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("$app/navigation", () => ({ invalidateAll: vi.fn() }));
vi.mock("$lib/utils/supabase", () => ({
	supabase: {
		rpc: vi.fn().mockResolvedValue({ error: null }),
		from: vi.fn().mockReturnValue({
			insert: vi.fn().mockResolvedValue({ error: null }),
			update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
			delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
		}),
	},
}));

global.fetch = vi.fn().mockResolvedValue({ ok: true, text: vi.fn().mockResolvedValue("") });

import { supabase } from "$lib/utils/supabase";
import { products, categories, registerSessions, users } from "./db";

describe("products", () => {
	beforeEach(() => vi.clearAllMocks());

	it("create calls insert", async () => {
		const data = { name: "Test", price: 10, stock_quantity: 5, facility_id: "f1", created_by: "u1" };
		await products.create(data);
		expect(supabase.from).toHaveBeenCalledWith("products");
	});

	it("update calls update", async () => {
		await products.update("p1", { name: "Updated" });
		expect(supabase.from).toHaveBeenCalledWith("products");
	});

	it("remove calls delete", async () => {
		await products.remove("p1");
		expect(supabase.from).toHaveBeenCalledWith("products");
	});
});

describe("categories", () => {
	beforeEach(() => vi.clearAllMocks());

	it("create calls insert", async () => {
		await categories.create({ name: "Test", facility_id: "f1" });
		expect(supabase.from).toHaveBeenCalledWith("categories");
	});

	it("update calls update", async () => {
		await categories.update("c1", { name: "Updated" });
		expect(supabase.from).toHaveBeenCalledWith("categories");
	});

	it("remove calls delete", async () => {
		await categories.remove("c1");
		expect(supabase.from).toHaveBeenCalledWith("categories");
	});
});

describe("registerSessions", () => {
	beforeEach(() => vi.clearAllMocks());

	it("open calls insert", async () => {
		await registerSessions.open("f1", "u1");
		expect(supabase.from).toHaveBeenCalledWith("register_sessions");
	});

	it("close calls RPC", async () => {
		await registerSessions.close("s1", "u1", 100, "notes");
		expect(supabase.rpc).toHaveBeenCalledWith("close_register_session", { p_session_id: "s1", p_user_id: "u1", p_closing_cash: 100, p_notes: "notes" });
	});

	it("close converts empty notes to null", async () => {
		await registerSessions.close("s1", "u1", 100);
		expect(supabase.rpc).toHaveBeenCalledWith("close_register_session", expect.objectContaining({ p_notes: null }));
	});
});

describe("users", () => {
	beforeEach(() => vi.clearAllMocks());

	it("create calls POST", async () => {
		const data = { email: "test@example.com", full_name: "Test", password: "pass", role: "staff" };
		await users.create(data);
		expect(fetch).toHaveBeenCalledWith("/api/admin/users", expect.objectContaining({ method: "POST" }));
	});

	it("update calls PUT", async () => {
		await users.update("u1", { full_name: "Updated" });
		expect(fetch).toHaveBeenCalledWith("/api/admin/users", expect.objectContaining({ method: "PUT" }));
	});

	it("remove calls DELETE", async () => {
		await users.remove("u1");
		expect(fetch).toHaveBeenCalledWith("/api/admin/users", expect.objectContaining({ method: "DELETE" }));
	});
});
