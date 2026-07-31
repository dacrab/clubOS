import { beforeEach, describe, expect, it, vi } from "vitest";

const now = vi.hoisted(() => ({ value: Date.now() }));
vi.stubGlobal("Date", {
	now: () => now.value,
});

const { checkRateLimit } = await import("./rate-limiter");

describe("checkRateLimit", () => {
	beforeEach(() => {
		now.value = 1_000_000_000_000;
	});

	it("allows the first request", () => {
		const result = checkRateLimit("ip:127.0.0.1", "burst");
		expect(result.allowed).toBe(true);
		expect(result.remaining).toBe(29);
	});

	it("blocks after exceeding the burst limit", () => {
		const key = "ip:10.0.0.1";
		for (let i = 0; i < 30; i++) {
			const r = checkRateLimit(key, "burst");
			if (i < 30) expect(r.allowed).toBe(true);
		}
		const blocked = checkRateLimit(key, "burst");
		expect(blocked.allowed).toBe(false);
		expect(blocked.remaining).toBe(0);
	});

	it("allows after the window expires", () => {
		const key = "ip:10.0.0.2";
		for (let i = 0; i < 30; i++) checkRateLimit(key, "burst");

		expect(checkRateLimit(key, "burst").allowed).toBe(false);

		now.value += 10_001;
		const after = checkRateLimit(key, "burst");
		expect(after.allowed).toBe(true);
	});

	it("supports minute tier separately", () => {
		const key = "ip:10.0.0.3";
		const r = checkRateLimit(key, "minute");
		expect(r.allowed).toBe(true);
		expect(r.remaining).toBe(199);
	});

	it("defaults to burst tier", () => {
		const r = checkRateLimit("some-key");
		expect(r.remaining).toBe(29);
	});
});
