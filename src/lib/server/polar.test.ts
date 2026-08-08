import { describe, expect, it } from "vitest";
import type { subscriptions } from "$lib/db/schema/subscriptions";
import { isActive } from "./polar";

type Sub = typeof subscriptions.$inferSelect;

function sub(overrides: Partial<Sub>): Sub {
	return {
		id: "id",
		tenantId: "tenant",
		polarCustomerId: null,
		polarSubscriptionId: null,
		status: "active",
		planName: null,
		currentPeriodEnd: null,
		trialEnd: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	};
}

describe("isActive", () => {
	it("returns false for null", () => {
		expect(isActive(null)).toBe(false);
	});

	it("returns false for non-active / non-trialing status", () => {
		expect(isActive(sub({ status: "past_due" }))).toBe(false);
		expect(isActive(sub({ status: "canceled" }))).toBe(false);
		expect(isActive(sub({ status: "unpaid" }))).toBe(false);
	});

	it("returns true for 'active' with a future currentPeriodEnd", () => {
		const future = new Date(Date.now() + 86400000);
		expect(isActive(sub({ currentPeriodEnd: future }))).toBe(true);
	});

	it("returns true for 'trialing' with a future trialEnd", () => {
		const future = new Date(Date.now() + 86400000);
		expect(isActive(sub({ status: "trialing", trialEnd: future }))).toBe(true);
	});

	it("returns false for 'active' with an expired currentPeriodEnd", () => {
		const past = new Date(Date.now() - 86400000);
		expect(isActive(sub({ currentPeriodEnd: past }))).toBe(false);
	});

	it("returns false for 'trialing' with an expired trialEnd", () => {
		const past = new Date(Date.now() - 86400000);
		expect(isActive(sub({ status: "trialing", trialEnd: past }))).toBe(false);
	});

	it("returns false when no end dates are set", () => {
		expect(isActive(sub({ status: "active", currentPeriodEnd: null, trialEnd: null }))).toBe(false);
	});
});
