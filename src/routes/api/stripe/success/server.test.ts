import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUpsert = vi.fn().mockResolvedValue({ error: null });
vi.mock("$lib/server/supabase-admin", () => ({ getSupabaseAdmin: () => ({ from: () => ({ upsert: mockUpsert }) }) }));
vi.mock("$env/dynamic/private", () => ({ env: { STRIPE_SECRET_KEY: "sk_test_123" } }));

import { GET } from "./+server";

const mockFetch = vi.fn();
beforeEach(() => { vi.clearAllMocks(); globalThis.fetch = mockFetch; });

const makeUrl = (sessionId?: string) => new URL(sessionId ? `http://localhost?session_id=${sessionId}` : "http://localhost");
const mockLocals = { user: { id: "u1" } } as App.Locals;

describe("GET /api/stripe/success", () => {
	it("redirects to /billing without session_id", async () => {
		await expect(GET({ url: makeUrl(), locals: mockLocals } as never)).rejects.toMatchObject({ status: 307, location: "/billing" });
	});

	it("redirects on Stripe API error", async () => {
		mockFetch.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ error: { message: "Invalid" } }) });
		await expect(GET({ url: makeUrl("sess_123"), locals: mockLocals } as never)).rejects.toMatchObject({ status: 307, location: "/billing?error=payment_failed" });
	});

	it("redirects on missing tenant", async () => {
		mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ subscription: {}, customer: "cus_1" }) });
		await expect(GET({ url: makeUrl("sess_123"), locals: mockLocals } as never)).rejects.toMatchObject({ status: 307, location: "/billing?error=missing_tenant" });
	});

	it("upserts subscription and redirects to admin", async () => {
		mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({
			subscription: { id: "sub_1", metadata: { tenant_id: "t1" }, status: "active", current_period_start: 1700000000, current_period_end: 1702592000, items: { data: [{ price: { id: "price_1", nickname: "Pro" } }] } },
			customer: "cus_1"
		}) });
		await expect(GET({ url: makeUrl("sess_123"), locals: mockLocals } as never)).rejects.toMatchObject({ status: 307, location: "/admin?welcome=true" });
		expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({ tenant_id: "t1", stripe_subscription_id: "sub_1", status: "active" }), { onConflict: "tenant_id" });
	});
});
