import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
	it("joins truthy strings with a space", () => {
		expect(cn("a", "b", "c")).toBe("a b c");
	});

	it("filters out falsy values", () => {
		expect(cn("a", false, null, undefined, "b")).toBe("a b");
	});

	it("returns empty string for all falsy", () => {
		expect(cn(false, null, undefined)).toBe("");
	});

	it("returns empty string for no arguments", () => {
		expect(cn()).toBe("");
	});
});
