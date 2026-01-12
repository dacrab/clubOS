import { describe, it, expect, vi } from "vitest";

vi.mock("$lib/utils/supabase", () => ({ supabase: { rpc: vi.fn() } }));

import { supabase } from "$lib/utils/supabase";
import { registerSessions } from "./db";

describe("registerSessions.close", () => {
	it("calls RPC with correct params", () => {
		registerSessions.close("s1", "u1", 100, "notes");
		expect(supabase.rpc).toHaveBeenCalledWith("close_register_session", { p_session_id: "s1", p_user_id: "u1", p_closing_cash: 100, p_notes: "notes" });
	});

	it("converts empty notes to null", () => {
		registerSessions.close("s1", "u1", 100);
		expect(supabase.rpc).toHaveBeenCalledWith("close_register_session", expect.objectContaining({ p_notes: null }));
	});
});
