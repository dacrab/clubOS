import { vi, beforeEach } from "vitest";

vi.mock("$app/environment", () => ({ browser: true, dev: true, building: false, version: "test" }));

vi.mock("$app/navigation", () => ({
	goto: vi.fn(),
	invalidate: vi.fn(),
	invalidateAll: vi.fn(),
	preloadData: vi.fn(),
	preloadCode: vi.fn(),
	afterNavigate: vi.fn(),
	beforeNavigate: vi.fn(),
	pushState: vi.fn(),
	replaceState: vi.fn(),
}));

vi.mock("$lib/state/settings.svelte", () => ({
	settings: {
		current: { currency_code: "EUR", date_format: "DD/MM/YYYY", time_format: "24h" },
		formatSettings: { currency_code: "EUR", date_format: "DD/MM/YYYY", time_format: "24h" },
		load: vi.fn(),
		save: vi.fn(),
	},
}));

// localStorage: use a simple Map — no class ceremony needed
const localStore = new Map<string, string>();
vi.stubGlobal("localStorage", {
	getItem: (k: string) => localStore.get(k) ?? null,
	setItem: (k: string, v: string) => localStore.set(k, String(v)),
	removeItem: (k: string) => localStore.delete(k),
	clear: () => localStore.clear(),
	key: (i: number) => Array.from(localStore.keys())[i] ?? null,
	get length() { return localStore.size; },
});

// document.documentElement stubs needed by theme + i18n
vi.stubGlobal("document", {
	documentElement: {
		setAttribute: vi.fn(),
		getAttribute: vi.fn().mockReturnValue(null),
		classList: { add: vi.fn(), remove: vi.fn(), toggle: vi.fn(), contains: vi.fn().mockReturnValue(false) },
	},
});

// matchMedia stub needed by theme (system preference detection)
vi.stubGlobal("matchMedia", vi.fn().mockImplementation((query: string) => ({
	matches: false,
	media: query,
	onchange: null,
	addEventListener: vi.fn(),
	removeEventListener: vi.fn(),
	dispatchEvent: vi.fn(),
})));

beforeEach(() => {
	localStore.clear();
	vi.clearAllMocks();
});
