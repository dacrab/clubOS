import { describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("$lib/utils/supabase", () => ({
	supabase: {
		auth: {
			getSession: vi.fn().mockResolvedValue({
				data: { session: { user: { id: "u1" } } },
			}),
		},
		from: vi.fn(),
		rpc: vi.fn(),
	},
}));

vi.mock("./facility.svelte", () => ({
	facilityState: {
		selectedId: null,
		resolveSelected: vi.fn().mockResolvedValue("fac-123"),
	},
}));

import { supabase } from "$lib/utils/supabase";
import { registerState } from "./register.svelte";

describe("registerState", () => {
	it("getOpenSession returns null when none open", async () => {
		// Setup mocks for this specific test
		const fromMock = supabase.from as any;
		fromMock.mockImplementation((table: string) => {
			if (table === "tenant_members") {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							// memberships
							data: [{ tenant_id: "t1" }],
						}),
					}),
				};
			}
			if (table === "register_sessions") {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							// tenant_id check
							eq: vi.fn().mockReturnValue({
								// facility_id check
								order: vi.fn().mockReturnValue({
									limit: vi.fn().mockResolvedValue({
										data: [{ id: "x", closed_at: "2024-01-01" }],
										error: null,
									}),
								}),
							}),
						}),
					}),
				};
			}
			return {};
		});

		const res = await registerState.getOpenSession();
		expect(res).toBeNull();
	});

	it("ensureOpenSession opens a new one when none exists", async () => {
		// We need to mock getOpenSession to return null first, effectively
		// But since it's a method on the same class/object, mocking it might be tricky if we want to test the logic *inside* ensureOpenSession.
		// However, ensureOpenSession calls `this.getOpenSession()`.
		// We can mock the internal calls or just mock the supabase responses to produce the same effect.
		// Let's mock supabase responses to simulate "no open session" then "insert success".

		const fromMock = supabase.from as any;
		fromMock.mockImplementation((table: string) => {
			if (table === "tenant_members") {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							data: [{ tenant_id: "t1" }],
						}),
					}),
				};
			}
			if (table === "register_sessions") {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								order: vi.fn().mockReturnValue({
									limit: vi.fn().mockResolvedValue({
										data: [], // No open session
										error: null,
									}),
								}),
							}),
						}),
					}),
					insert: vi.fn().mockReturnValue({
						select: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: { id: "s-new" },
								error: null,
							}),
						}),
					}),
				};
			}
			return {};
		});

		const res = await registerState.ensureOpenSession("u1");
		expect(res).toBe("s-new");
	});
});
