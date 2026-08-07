import { describe, expect, it } from "vitest";
import { isActive } from "./polar";

describe("isActive", () => {
	it("returns false for null / undefined", () => {
		expect(isActive(null)).toBe(false);
		expect(isActive(undefined)).toBe(false);
	});

	it("returns false for non-object values", () => {
		expect(isActive("string")).toBe(false);
		expect(isActive(42)).toBe(false);
		expect(isActive(true)).toBe(false);
	});

	it("returns false for non-active / non-trialing status", () => {
		expect(isActive({ status: "past_due" })).toBe(false);
		expect(isActive({ status: "canceled" })).toBe(false);
		expect(isActive({ status: "incomplete" })).toBe(false);
	});

	it("returns true for 'active' with a future periodEnd", () => {
		const future = new Date(Date.now() + 86400000).toISOString();
		expect(isActive({ status: "active", periodEnd: future })).toBe(true);
	});

	it("returns true for 'trialing' with a future trialEnd", () => {
		const future = new Date(Date.now() + 86400000).toISOString();
		expect(isActive({ status: "trialing", trialEnd: future })).toBe(true);
	});

	it("returns false for 'active' with an expired periodEnd", () => {
		const past = new Date(Date.now() - 86400000).toISOString();
		expect(isActive({ status: "active", periodEnd: past })).toBe(false);
	});

	it("returns false for 'trialing' with an expired trialEnd", () => {
		const past = new Date(Date.now() - 86400000).toISOString();
		expect(isActive({ status: "trialing", trialEnd: past })).toBe(false);
	});
});
