import { vi } from "vitest";

// Mock supabase-client BEFORE mocking $env/dynamic/public
// This ensures supabase-client doesn't try to import $env/dynamic/public
vi.mock("$lib/supabase-client", () => ({
	supabase: {},
}));

import { describe, expect, it } from "vitest";
import { getInventorySettings, settingsStore } from "./settings";

describe("settings", () => {
	const EXPECTED_LOW_STOCK_THRESHOLD = 7;

	it("returns inventory settings from store snapshot", () => {
		settingsStore.set({
			tenant: {
				lowStockThreshold: EXPECTED_LOW_STOCK_THRESHOLD,
				allowUnlimitedStock: false,
				negativeStockAllowed: true,
				defaultCategorySort: "name",
				productsPageSize: 50,
				imageMaxSizeMb: 5,
				couponsValue: 2,
				allowTreats: true,
				requireOpenRegisterForSale: true,
				currencyCode: "EUR",
				taxRatePercent: 0,
				receiptFooterText: null,
				bookingDefaultDurationMin: 60,
				footballFieldsCount: 2,
				appointmentBufferMin: 15,
				preventOverlaps: true,
				themeDefault: "system",
				defaultLocale: "en",
			},
			user: {
				collapsedSidebar: false,
				denseTableMode: false,
				defaultLocale: "en",
				theme: "system",
			},
		});
		const inv = getInventorySettings();
		expect(inv.lowStockThreshold).toBe(EXPECTED_LOW_STOCK_THRESHOLD);
		expect(inv.allowUnlimitedStock).toBe(false);
		expect(inv.negativeStockAllowed).toBe(true);
	});
});
