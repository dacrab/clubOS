interface Entry {
	count: number;
	resetAt: number;
}

const store = new Map<string, Entry>();

const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanup() {
	const now = Date.now();
	if (now - lastCleanup < CLEANUP_INTERVAL) return;
	lastCleanup = now;
	for (const [key, entry] of store) {
		if (now > entry.resetAt) store.delete(key);
	}
}

const TIERS = [
	{ limit: 30, windowMs: 10_000, label: "burst" },
	{ limit: 200, windowMs: 60_000, label: "minute" },
] as const;

export function checkRateLimit(
	key: string,
	tier: "burst" | "minute" = "burst",
): { allowed: boolean; remaining: number; resetAt: number } {
	cleanup();
	const cfg = TIERS.find((t) => t.label === tier) ?? TIERS[0];
	const now = Date.now();
	const entry = store.get(key);

	if (!entry || now > entry.resetAt) {
		store.set(key, { count: 1, resetAt: now + cfg.windowMs });
		return { allowed: true, remaining: cfg.limit - 1, resetAt: now + cfg.windowMs };
	}

	entry.count = Math.min(entry.count + 1, cfg.limit + 1);
	const remaining = Math.max(0, cfg.limit - entry.count);
	const allowed = entry.count <= cfg.limit;

	return { allowed, remaining, resetAt: entry.resetAt };
}
