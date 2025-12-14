import { describe, it, expect, vi } from "vitest";

// Provide a minimal mock for the dynamic private env module so the
// supabase-admin module can be imported in isolation without depending
// on real environment variables.
vi.mock("$env/dynamic/private", () => ({ env: {} }));

describe("supabase-admin module", () => {
	it("exports getSupabaseAdmin factory", async () => {
		const mod = await import("./supabase-admin");
		expect(typeof mod.getSupabaseAdmin).toBe("function");
	});
});

