import { describe, expect, it, vi } from "vitest";
import { ensureOpenSession, getOpenSession } from "./register";

function makeSupabaseMock(overrides: Partial<any> = {}) {
	const base = {
		auth: {
			getSession: vi
				.fn()
				.mockResolvedValue({ data: { session: { user: { id: "u1" } } } }),
		},
		from: vi.fn(),
		rpc: vi.fn(),
	};
	return Object.assign(base, overrides);
}

describe("register utils", () => {
	it("getOpenSession returns null when none open", async () => {
		const supabase = makeSupabaseMock({
			from: vi.fn((table: string) => {
				if (table === "tenant_members") {
					// Chain: .select().eq().limit()
					const limitObj = {
						limit: vi.fn().mockResolvedValue({ data: [{ tenant_id: "t1" }] }),
					};
					const eqObj = {
						eq: vi.fn(() => limitObj),
					};
					return {
						select: vi.fn(() => eqObj),
					};
				}
				if (table === "facility_members") {
					// Chain: .select().eq().order().limit()
					const limitObj2 = {
						limit: vi.fn().mockResolvedValue({ data: null }),
					};
					const orderObj = {
						order: vi.fn(() => limitObj2),
					};
					const eqObj2 = {
						eq: vi.fn(() => orderObj),
					};
					return {
						select: vi.fn(() => eqObj2),
					};
				}
				if (table === "facilities") {
					// Chain: .select().eq().order().limit()
					const limitObj3 = {
						limit: vi.fn().mockResolvedValue({ data: null }),
					};
					const orderObj2 = {
						order: vi.fn(() => limitObj3),
					};
					const eqObj3 = {
						eq: vi.fn(() => orderObj2),
					};
					return {
						select: vi.fn(() => eqObj3),
					};
				}
				if (table === "register_sessions") {
					return {
						select: vi.fn(() => ({
							eq: vi.fn(() => ({
								order: vi.fn(() => ({
									limit: vi.fn().mockResolvedValue({
										data: [{ id: "x", closed_at: "2024-01-01" }],
										error: null,
									}),
								})),
							})),
						})),
					};
				}
				return {};
			}),
		});
		const res = await getOpenSession(supabase as any);
		expect(res).toBeNull();
	});

	it("ensureOpenSession opens a new one when none exists", async () => {
		const supabase = makeSupabaseMock({
			from: vi.fn((table: string) => {
				if (table === "tenant_members") {
					// Chain: .select().eq().limit()
					const limitObj4 = {
						limit: vi.fn().mockResolvedValue({ data: [{ tenant_id: "t1" }] }),
					};
					const eqObj4 = {
						eq: vi.fn(() => limitObj4),
					};
					return {
						select: vi.fn(() => eqObj4),
					};
				}
				if (table === "facility_members") {
					// Chain: .select().eq().order().limit()
					const limitObj5 = {
						limit: vi.fn().mockResolvedValue({ data: null }),
					};
					const orderObj3 = {
						order: vi.fn(() => limitObj5),
					};
					const eqObj5 = {
						eq: vi.fn(() => orderObj3),
					};
					return {
						select: vi.fn(() => eqObj5),
					};
				}
				if (table === "facilities") {
					// Chain: .select().eq().order().limit()
					const limitObj6 = {
						limit: vi.fn().mockResolvedValue({ data: null }),
					};
					const orderObj4 = {
						order: vi.fn(() => limitObj6),
					};
					const eqObj6 = {
						eq: vi.fn(() => orderObj4),
					};
					return {
						select: vi.fn(() => eqObj6),
					};
				}
				if (table === "register_sessions") {
					return {
						select: vi.fn(() => ({
							eq: vi.fn(() => ({
								order: vi.fn(() => ({
									limit: vi.fn(() => ({
										maybeSingle: vi.fn().mockResolvedValue({ data: [] }),
									})),
								})),
							})),
						})),
						insert: vi.fn(() => ({
							select: vi.fn(() => ({
								single: vi.fn().mockResolvedValue({
									data: { id: "s-new" },
									error: null,
								}),
							})),
						})),
					};
				}
				return {};
			}),
		});
		const res = await ensureOpenSession(supabase as any, "u1");
		expect(res).toBe("s-new");
	});
});
