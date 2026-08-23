import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const now = vi.hoisted(() => ({ value: Date.now() }));
const envState = vi.hoisted(() => ({ env: {} as Record<string, string | undefined> }));

vi.mock("$env/dynamic/private", () => ({ env: envState.env }));
vi.stubGlobal("Date", { now: () => now.value });

const fetchMock = vi.hoisted(() => vi.fn());
vi.stubGlobal("fetch", fetchMock);

const { checkRateLimit, __resetMemoryStore } = await import("./rate-limiter");

beforeEach(() => {
	now.value = 1_000_000_000_000;
	for (const key of Object.keys(envState.env)) delete envState.env[key];
	fetchMock.mockReset();
	__resetMemoryStore();
	vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("checkRateLimit (memory store)", () => {
	it("allows the first request", async () => {
		const result = await checkRateLimit("ip:127.0.0.1", "burst");
		expect(result.allowed).toBe(true);
		expect(result.remaining).toBe(29);
	});

	it("blocks after exceeding the burst limit", async () => {
		const key = "ip:10.0.0.1";
		for (let i = 0; i < 30; i++) {
			const r = await checkRateLimit(key, "burst");
			expect(r.allowed).toBe(true);
		}
		const blocked = await checkRateLimit(key, "burst");
		expect(blocked.allowed).toBe(false);
		expect(blocked.remaining).toBe(0);
	});

	it("allows after the window expires", async () => {
		const key = "ip:10.0.0.2";
		for (let i = 0; i < 30; i++) await checkRateLimit(key, "burst");

		expect((await checkRateLimit(key, "burst")).allowed).toBe(false);

		now.value += 10_001;
		expect((await checkRateLimit(key, "burst")).allowed).toBe(true);
	});

	it("supports minute tier separately", async () => {
		const r = await checkRateLimit("ip:10.0.0.3", "minute");
		expect(r.allowed).toBe(true);
		expect(r.remaining).toBe(199);
	});
});

describe("checkRateLimit (upstash store)", () => {
	beforeEach(() => {
		envState.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
		envState.env.UPSTASH_REDIS_REST_TOKEN = "tok";
	});

	function mockUpstash(count: number, pttl = 5000) {
		fetchMock.mockResolvedValueOnce(
			new Response(JSON.stringify([{ result: count }, { result: 1 }, { result: pttl }]), {
				status: 200,
			}),
		);
	}

	it("sends INCR/EXPIRE NX/PTTL pipeline and allows under the limit", async () => {
		mockUpstash(1, 9_500);
		const result = await checkRateLimit("ip:1.2.3.4", "burst");

		expect(fetchMock).toHaveBeenCalledOnce();
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe("https://example.upstash.io/pipeline");
		expect((init.headers as Record<string, string>).authorization).toBe("Bearer tok");
		expect(JSON.parse(String(init.body))).toEqual([
			["INCR", "burst:ip:1.2.3.4"],
			["EXPIRE", "burst:ip:1.2.3.4", "10", "NX"],
			["PTTL", "burst:ip:1.2.3.4"],
		]);
		expect(result.allowed).toBe(true);
		expect(result.remaining).toBe(29);
		expect(result.resetAt).toBe(now.value + 9_500);
	});

	it("blocks when the counter exceeds the limit", async () => {
		mockUpstash(31, 1_000);
		const result = await checkRateLimit("ip:5.6.7.8", "burst");
		expect(result.allowed).toBe(false);
		expect(result.remaining).toBe(0);
	});

	it("fails open to the memory store on Upstash errors (warn once)", async () => {
		fetchMock.mockRejectedValue(new Error("boom"));

		const first = await checkRateLimit("ip:fail-open", "burst");
		const second = await checkRateLimit("ip:fail-open", "burst");
		expect(first.allowed).toBe(true);
		expect(second.allowed).toBe(true);
		expect(console.warn).toHaveBeenCalledTimes(1);

		// The fallback hit went through the memory store.
		for (let i = 0; i < 28; i++) await checkRateLimit("ip:fail-open", "burst");
		expect((await checkRateLimit("ip:fail-open", "burst")).allowed).toBe(false);
	});

	it("falls back to a fresh window when PTTL is unavailable", async () => {
		fetchMock.mockResolvedValueOnce(
			new Response(JSON.stringify([{ result: 2 }, { result: 1 }, { result: -1 }]), { status: 200 }),
		);
		const result = await checkRateLimit("ip:9.9.9.9", "minute");
		expect(result.resetAt).toBe(now.value + 60_000);
	});
});
