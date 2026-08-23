/**
 * Rate limiting with a pluggable store. Uses Upstash Redis (REST, fetch-based)
 * when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set so the limit
 * holds across serverless instances; otherwise falls back to a process-local
 * Map that only softens abuse within one warm instance. Any Upstash failure
 * fails open to the memory store (logged once per process).
 */
import { env } from "$env/dynamic/private";

interface Hit {
	count: number;
	resetAt: number;
}

interface RateLimitStore {
	hit(key: string, windowMs: number): Promise<Hit>;
}

// ── Memory store ──

const memStore = new Map<string, Hit>();
let lastCleanup = Date.now();

function cleanupMemory() {
	const now = Date.now();
	if (now - lastCleanup < 60_000) return;
	lastCleanup = now;
	for (const [key, entry] of memStore) {
		if (now > entry.resetAt) memStore.delete(key);
	}
}

const memoryStore: RateLimitStore = {
	async hit(key, windowMs) {
		cleanupMemory();
		const now = Date.now();
		const entry = memStore.get(key);
		if (!entry || now > entry.resetAt) {
			const fresh = { count: 1, resetAt: now + windowMs };
			memStore.set(key, fresh);
			return fresh;
		}
		entry.count += 1;
		return entry;
	},
};

// ── Upstash store ──

let upstashWarned = false;

function warnOnce(message: string, err: unknown) {
	if (upstashWarned) return;
	upstashWarned = true;
	console.warn(`rate-limiter: ${message}, failing open to memory`, err);
}

async function upstashPipeline(commands: string[][]): Promise<unknown[]> {
	const res = await fetch(`${env.UPSTASH_REDIS_REST_URL}/pipeline`, {
		method: "POST",
		headers: {
			authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`,
			"content-type": "application/json",
		},
		body: JSON.stringify(commands),
	});
	if (!res.ok) throw new Error(`Upstash REST ${res.status}`);
	const body: unknown = await res.json();
	if (!Array.isArray(body)) throw new Error("Upstash REST: unexpected body");
	return body.map((r) => (r as { result?: unknown }).result);
}

const upstashStore: RateLimitStore = {
	async hit(key, windowMs) {
		const now = Date.now();
		const results = await upstashPipeline([
			["INCR", key],
			["EXPIRE", key, String(Math.ceil(windowMs / 1000)), "NX"],
			["PTTL", key],
		]);
		const count = Number(results[0] ?? 0);
		const pttl = Number(results[2] ?? -1);
		return { count, resetAt: pttl > 0 ? now + pttl : now + windowMs };
	},
};

// ── Public API ──

function getStore(): RateLimitStore {
	if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
		return {
			hit: async (key, windowMs) => {
				try {
					return await upstashStore.hit(key, windowMs);
				} catch (err) {
					warnOnce("Upstash unavailable", err);
					return memoryStore.hit(key, windowMs);
				}
			},
		};
	}
	return memoryStore;
}

const TIERS = [
	{ limit: 30, windowMs: 10_000, label: "burst" },
	{ limit: 200, windowMs: 60_000, label: "minute" },
] as const;

export async function checkRateLimit(
	key: string,
	tier: "burst" | "minute" = "burst",
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
	const cfg = TIERS.find((t) => t.label === tier) ?? TIERS[0];
	const { count, resetAt } = await getStore().hit(`${tier}:${key}`, cfg.windowMs);
	return {
		allowed: count <= cfg.limit,
		remaining: Math.max(0, cfg.limit - count),
		resetAt,
	};
}

/** Test hook: clear the in-process memory store. */
export function __resetMemoryStore(): void {
	memStore.clear();
	lastCleanup = Date.now();
}
