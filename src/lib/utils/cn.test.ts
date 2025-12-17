import { describe, it, expect } from "vitest";
import { cn } from "./cn";

describe("cn utility", () => {
	it("merges tailwind classes and handles conditionals", () => {
		// Basic merge: p-4 overrides specific padding
		expect(cn("px-4 py-2", "p-4")).toBe("p-4"); 
		
		// Non-conflicting merge
		expect(cn("p-4", "m-4")).toBe("p-4 m-4");

		// Conditionals
		expect(cn("base", { active: true, disabled: false })).toBe("base active");
		
		// Arrays/Complex
		expect(cn("text-red-500", ["bg-blue-500", { "text-green-500": true }])).toBe("bg-blue-500 text-green-500");
	});
});
