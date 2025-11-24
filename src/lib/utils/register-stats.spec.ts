import { describe, expect, it } from "vitest";
import { discountsForSession, ordersTotalForSession } from "./register-stats";

describe("register stats", () => {
	const orders = [
		{
			id: "1",
			subtotal: 100,
			discount_amount: 10,
			total_amount: 90,
			coupon_count: 1,
			created_at: "2024-01-01",
		},
		{
			id: "2",
			subtotal: 50,
			discount_amount: 0,
			total_amount: 50,
			coupon_count: 0,
			created_at: "2024-01-01",
		},
	];

	const closing = {
		session_id: "s1",
		orders_total: 140,
		treat_total: 0,
		total_discounts: 10,
		treat_count: 0,
		notes: null,
	};

	it("calculates total orders amount correctly", () => {
		// Should use closing if available
		expect(ordersTotalForSession(closing, orders)).toBe(140);
		// Should calculate from orders if closing is null
		expect(ordersTotalForSession(undefined, orders)).toBe(140);
	});

	it("calculates total discounts correctly", () => {
		expect(discountsForSession(closing, orders)).toBe(10);
		expect(discountsForSession(undefined, orders)).toBe(10);
	});
});
