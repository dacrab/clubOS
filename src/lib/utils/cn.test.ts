import { describe, it, expect } from "vitest";
import { cn } from "./cn";

describe("cn (className utility)", () => {
	describe("basic functionality", () => {
		it("should return empty string for no arguments", () => {
			expect(cn()).toBe("");
		});

		it("should return single class unchanged", () => {
			expect(cn("foo")).toBe("foo");
		});

		it("should join multiple classes with space", () => {
			expect(cn("foo", "bar")).toBe("foo bar");
		});

		it("should handle undefined and null values", () => {
			expect(cn("foo", undefined, "bar", null)).toBe("foo bar");
		});

		it("should handle boolean false values", () => {
			expect(cn("foo", false, "bar")).toBe("foo bar");
		});

		it("should handle empty strings", () => {
			expect(cn("foo", "", "bar")).toBe("foo bar");
		});
	});

	describe("conditional classes", () => {
		it("should handle conditional object syntax", () => {
			expect(cn({ foo: true, bar: false })).toBe("foo");
		});

		it("should handle mixed string and object", () => {
			expect(cn("base", { active: true, disabled: false })).toBe("base active");
		});

		it("should handle arrays of classes", () => {
			expect(cn(["foo", "bar"])).toBe("foo bar");
		});

		it("should handle nested arrays", () => {
			expect(cn(["foo", ["bar", "baz"]])).toBe("foo bar baz");
		});
	});

	describe("tailwind merge functionality", () => {
		it("should merge conflicting padding classes", () => {
			expect(cn("p-4", "p-2")).toBe("p-2");
		});

		it("should merge conflicting margin classes", () => {
			expect(cn("m-4", "m-8")).toBe("m-8");
		});

		it("should merge conflicting text colors", () => {
			expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
		});

		it("should merge conflicting background colors", () => {
			expect(cn("bg-red-500", "bg-blue-500")).toBe("bg-blue-500");
		});

		it("should keep non-conflicting classes", () => {
			expect(cn("p-4", "m-4")).toBe("p-4 m-4");
		});

		it("should merge width classes", () => {
			expect(cn("w-full", "w-1/2")).toBe("w-1/2");
		});

		it("should merge height classes", () => {
			expect(cn("h-10", "h-20")).toBe("h-20");
		});

		it("should merge flex direction classes", () => {
			expect(cn("flex-row", "flex-col")).toBe("flex-col");
		});

		it("should handle responsive prefixes", () => {
			expect(cn("md:p-4", "md:p-8")).toBe("md:p-8");
		});

		it("should handle hover states", () => {
			expect(cn("hover:bg-red-500", "hover:bg-blue-500")).toBe("hover:bg-blue-500");
		});
	});

	describe("complex scenarios", () => {
		it("should handle button variant patterns", () => {
			const baseClasses = "px-4 py-2 rounded";
			const variantClasses = "bg-blue-500 text-white";
			const sizeClasses = "text-sm";
			expect(cn(baseClasses, variantClasses, sizeClasses)).toBe(
				"px-4 py-2 rounded bg-blue-500 text-white text-sm"
			);
		});

		it("should handle card component patterns", () => {
			expect(
				cn(
					"rounded-lg border bg-card text-card-foreground shadow-sm",
					"p-6",
					{ "opacity-50": false, "pointer-events-none": false }
				)
			).toBe("rounded-lg border bg-card text-card-foreground shadow-sm p-6");
		});

		it("should handle override patterns common in component props", () => {
			const defaultClasses = "p-4 bg-gray-100 text-gray-900";
			const propClasses = "p-8 bg-white";
			expect(cn(defaultClasses, propClasses)).toBe("text-gray-900 p-8 bg-white");
		});
	});
});
