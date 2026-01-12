import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("$lib/utils/supabase", () => ({
	supabase: {
		from: vi.fn(() => ({ insert: vi.fn(), update: vi.fn(() => ({ eq: vi.fn() })), delete: vi.fn(() => ({ eq: vi.fn() })) })),
		rpc: vi.fn(),
	},
}));

import { supabase } from "$lib/utils/supabase";
import { products, categories, registerSessions } from "./db";

beforeEach(() => vi.clearAllMocks());

describe("products", () => {
	const data = { name: "Test", price: 10, stock_quantity: 5, facility_id: "f1", created_by: "u1" };

	it("create calls insert", () => { products.create(data); expect(supabase.from).toHaveBeenCalledWith("products"); });
	it("update calls update+eq", () => { products.update("p1", { name: "New" }); expect(supabase.from).toHaveBeenCalledWith("products"); });
	it("remove calls delete+eq", () => { products.remove("p1"); expect(supabase.from).toHaveBeenCalledWith("products"); });
});

describe("categories", () => {
	it("create calls insert", () => { categories.create({ name: "Cat", facility_id: "f1" }); expect(supabase.from).toHaveBeenCalledWith("categories"); });
	it("update calls update+eq", () => { categories.update("c1", { name: "New" }); expect(supabase.from).toHaveBeenCalledWith("categories"); });
	it("remove calls delete+eq", () => { categories.remove("c1"); expect(supabase.from).toHaveBeenCalledWith("categories"); });
});

describe("registerSessions", () => {
	it("open inserts session", () => { registerSessions.open("f1", "u1"); expect(supabase.from).toHaveBeenCalledWith("register_sessions"); });
	it("close calls RPC", () => { registerSessions.close("s1", "u1", 100, "notes"); expect(supabase.rpc).toHaveBeenCalledWith("close_register_session", { p_session_id: "s1", p_user_id: "u1", p_closing_cash: 100, p_notes: "notes" }); });
	it("close handles empty notes", () => { registerSessions.close("s1", "u1", 100); expect(supabase.rpc).toHaveBeenCalledWith("close_register_session", expect.objectContaining({ p_notes: null })); });
});
