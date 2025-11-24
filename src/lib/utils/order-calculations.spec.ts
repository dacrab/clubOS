import { describe, expect, it } from "vitest";
import { discountAmount, subtotal, totalAmount } from "./order-calculations";

describe("order calculations", () => {
	const items = [
		{ id: "1", name: "Item 1", price: 10 },
		{ id: "2", name: "Item 2", price: 20, is_treat: true },
		{ id: "3", name: "Item 3", price: 30 },
	];

	it("calculates subtotal correctly", () => {
		expect(subtotal(items)).toBe(60);
	});

	it("calculates discount correctly", () => {
		expect(discountAmount(2)).toBe(4); // 2 * 2
	});

	it("calculates total correctly with treats and coupons", () => {
		// Subtotal: 60
		// Treat discount: 20 (Item 2 is treat)
		// Coupon discount: 4 (2 coupons)
		// Total discount: 24
		// Total: 60 - 24 = 36
		expect(totalAmount(items, 2)).toBe(36);
	});

	it("calculates total correctly without discounts", () => {
		const plainItems = [
			{ id: "1", name: "Item 1", price: 10 },
			{ id: "3", name: "Item 3", price: 30 },
		];
		expect(totalAmount(plainItems, 0)).toBe(40);
	});
});
