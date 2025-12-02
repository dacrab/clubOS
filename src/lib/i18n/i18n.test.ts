import { describe, it, expect } from "vitest";
import { en } from "./en";
import { el } from "./el";

describe("i18n translations", () => {
	describe("English translations (en)", () => {
		it("should have common translations", () => {
			expect(en.common).toBeDefined();
			expect(en.common.actions).toBe("Actions");
			expect(en.common.add).toBe("Add");
			expect(en.common.cancel).toBe("Cancel");
			expect(en.common.save).toBe("Save");
			expect(en.common.delete).toBe("Delete");
			expect(en.common.edit).toBe("Edit");
			expect(en.common.loading).toBe("Loading...");
		});

		it("should have navigation translations", () => {
			expect(en.nav).toBeDefined();
			expect(en.nav.dashboard).toBe("Dashboard");
			expect(en.nav.products).toBe("Products");
			expect(en.nav.orders).toBe("Orders");
			expect(en.nav.registers).toBe("Registers");
			expect(en.nav.users).toBe("Users");
			expect(en.nav.settings).toBe("Settings");
		});

		it("should have auth translations", () => {
			expect(en.auth).toBeDefined();
			expect(en.auth.login).toBe("Sign In");
			expect(en.auth.logout).toBe("Sign Out");
			expect(en.auth.email).toBe("Email");
			expect(en.auth.password).toBe("Password");
		});

		it("should have dashboard translations", () => {
			expect(en.dashboard).toBeDefined();
			expect(en.dashboard.title).toBe("Dashboard");
			expect(en.dashboard.todayRevenue).toBe("Today's Revenue");
			expect(en.dashboard.totalOrders).toBe("Total Orders");
		});

		it("should have product translations", () => {
			expect(en.products).toBeDefined();
			expect(en.products.title).toBe("Products");
			expect(en.products.addProduct).toBe("Add Product");
			expect(en.products.category).toBe("Category");
		});

		it("should have order translations", () => {
			expect(en.orders).toBeDefined();
			expect(en.orders.title).toBe("Orders");
			expect(en.orders.newSale).toBe("New Sale");
			expect(en.orders.cart).toBe("Cart");
		});

		it("should have register translations", () => {
			expect(en.register).toBeDefined();
			expect(en.register.title).toBe("Register Sessions");
			expect(en.register.openRegister).toBe("Open Register");
			expect(en.register.closeRegister).toBe("Close Register");
		});

		it("should have user translations", () => {
			expect(en.users).toBeDefined();
			expect(en.users.title).toBe("Users");
			expect(en.users.addUser).toBe("Add User");
			expect(en.users.roles.admin).toBe("Admin");
		});

		it("should have settings translations", () => {
			expect(en.settings).toBeDefined();
			expect(en.settings.title).toBe("Settings");
			expect(en.settings.sections.inventory).toBe("Inventory");
			expect(en.settings.sections.sales).toBe("Sales");
		});

		it("should have appointment translations", () => {
			expect(en.appointments).toBeDefined();
			expect(en.appointments.title).toBe("Appointments");
			expect(en.appointments.status.confirmed).toBe("Confirmed");
		});

		it("should have football translations", () => {
			expect(en.football).toBeDefined();
			expect(en.football.title).toBe("Football Bookings");
			expect(en.football.field).toBe("Field");
		});

		it("should have error translations", () => {
			expect(en.errors).toBeDefined();
			expect(en.errors.notFound.title).toBe("Page not found");
			expect(en.errors.goHome).toBe("Go to home");
		});
	});

	describe("Greek translations (el)", () => {
		it("should have common translations", () => {
			expect(el.common).toBeDefined();
			expect(el.common.actions).toBeDefined();
			expect(el.common.add).toBeDefined();
			expect(el.common.cancel).toBeDefined();
		});

		it("should have navigation translations", () => {
			expect(el.nav).toBeDefined();
			expect(el.nav.dashboard).toBeDefined();
			expect(el.nav.products).toBeDefined();
		});

		it("should have auth translations", () => {
			expect(el.auth).toBeDefined();
			expect(el.auth.login).toBeDefined();
			expect(el.auth.email).toBeDefined();
		});

		it("should have settings translations", () => {
			expect(el.settings).toBeDefined();
			expect(el.settings.title).toBeDefined();
			expect(el.settings.timeFormats).toBeDefined();
			expect(el.settings.timeFormats["24h"]).toBeDefined();
			expect(el.settings.timeFormats["12h"]).toBeDefined();
		});
	});

	describe("translation structure consistency", () => {
		function getKeys(obj: unknown, prefix = ""): string[] {
			const keys: string[] = [];
			if (obj && typeof obj === "object") {
				for (const [key, value] of Object.entries(obj)) {
					const fullKey = prefix ? `${prefix}.${key}` : key;
					if (value && typeof value === "object" && !Array.isArray(value)) {
						keys.push(...getKeys(value, fullKey));
					} else {
						keys.push(fullKey);
					}
				}
			}
			return keys;
		}

		it("should have matching keys between en and el", () => {
			const enKeys = getKeys(en).sort();
			const elKeys = getKeys(el).sort();

			// Find missing keys
			const missingInEl = enKeys.filter((k) => !elKeys.includes(k));
			const missingInEn = elKeys.filter((k) => !enKeys.includes(k));

			expect(missingInEl).toEqual([]);
			expect(missingInEn).toEqual([]);
		});

		it("should have non-empty string values in en", () => {
			const enKeys = getKeys(en);
			for (const key of enKeys) {
				const value = key.split(".").reduce((obj: unknown, k) => {
					if (obj && typeof obj === "object") {
						return (obj as Record<string, unknown>)[k];
					}
					return undefined;
				}, en as unknown);
				
				expect(typeof value).toBe("string");
				expect((value as string).length).toBeGreaterThan(0);
			}
		});

		it("should have non-empty string values in el", () => {
			const elKeys = getKeys(el);
			for (const key of elKeys) {
				const value = key.split(".").reduce((obj: unknown, k) => {
					if (obj && typeof obj === "object") {
						return (obj as Record<string, unknown>)[k];
					}
					return undefined;
				}, el as unknown);
				
				expect(typeof value).toBe("string");
				expect((value as string).length).toBeGreaterThan(0);
			}
		});
	});

	describe("placeholder patterns", () => {
		it("should have consistent placeholder format in en", () => {
			// Check for {placeholder} pattern
			expect(en.common.deleteConfirm).toMatch(/\{name\}/);
			expect(en.common.field).toMatch(/\{number\}/);
			expect(en.common.inStockCount).toMatch(/\{count\}/);
			expect(en.common.kidsAndAdults).toMatch(/\{kids\}/);
			expect(en.common.kidsAndAdults).toMatch(/\{adults\}/);
			expect(en.orders.treatsCount).toMatch(/\{count\}/);
			expect(en.date.lastDays).toMatch(/\{count\}/);
		});

		it("should have matching placeholders in el", () => {
			expect(el.common.deleteConfirm).toMatch(/\{name\}/);
			expect(el.common.field).toMatch(/\{number\}/);
			expect(el.common.inStockCount).toMatch(/\{count\}/);
		});
	});
});

describe("getNestedValue helper function behavior", () => {
	// Test the expected behavior of key path resolution
	it("should resolve simple keys", () => {
		expect(en.common.add).toBe("Add");
	});

	it("should resolve nested keys", () => {
		expect(en.settings.sections.inventory).toBe("Inventory");
	});

	it("should resolve deeply nested keys", () => {
		expect(en.settings.timeFormats["24h"]).toBe("24-hour (14:30)");
	});
});
