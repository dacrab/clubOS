import { describe, expect, it, vi } from "vitest";
import { ensureOpenSession, getOpenSession } from "./register";

function makeSupabaseMock(overrides: Partial<any> = {}) {
	const base = {
		auth: {
			getSession: vi
				.fn()
				.mockResolvedValue({ data: { session: { user: { id: "u1" } } } }),
		},
		from: vi.fn(() => ({
			select: vi.fn(() => ({
				eq: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				maybeSingle: vi.fn().mockResolvedValue({ data: null }),
			})),
			insert: vi.fn(() => ({
				select: vi.fn(() => ({
					single: vi
						.fn()
						.mockResolvedValue({ data: { id: "s-new" }, error: null }),
				})),
			})),
			eq: vi.fn().mockReturnThis(),
			order: vi.fn().mockReturnThis(),
			limit: vi.fn().mockReturnThis(),
			maybeSingle: vi.fn().mockResolvedValue({ data: null }),
		})),
		rpc: vi.fn(),
	};
	return Object.assign(base, overrides);
}

describe("register utils", () => {
	it("getOpenSession returns null when none open", async () => {
		const supabase = makeSupabaseMock({
			from: () => ({
				select: () => ({
					eq: () => ({
						order: () => ({
							limit: () => ({
								maybeSingle: () =>
									Promise.resolve({
										data: [{ id: "x", closed_at: "2024-01-01" }],
									}),
							}),
						}),
					}),
				}),
			}),
		});
		const res = await getOpenSession(supabase as any);
		expect(res).toBeNull();
	});

	it("ensureOpenSession opens a new one when none exists", async () => {
		const supabase = makeSupabaseMock({
			from: (table: string) => {
				if (table === "register_sessions") {
					return {
						select: () => ({
							eq: () => ({
								order: () => ({
									limit: () => ({
										maybeSingle: () => Promise.resolve({ data: [] }),
									}),
								}),
							}),
						}),
						insert: () => ({
							select: () => ({
								single: () =>
									Promise.resolve({ data: { id: "s-new" }, error: null }),
							}),
						}),
					} as any;
				}
				if (table === "tenant_members") {
					return {
						select: () => ({
							eq: () => Promise.resolve({ data: [{ tenant_id: "t1" }] }),
						}),
					} as any;
				}
				return {} as any;
			},
		});
		const res = await ensureOpenSession(supabase as any, "u1");
		expect(res).toBe("s-new");
	});
});
