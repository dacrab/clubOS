import { describe, it, expect } from "vitest";
import { cn } from "./cn";

describe("cn utility", () => {
	it("merges tailwind classes and handles conditionals", () => {
		// Basic merge
		expect(cn("px-4 py-2", "p-4")).toBe("py-2 p-4"); // tailwind-merge override behavior check
		
		// Conditionals
		expect(cn("base", { active: true, disabled: false })).toBe("base active");
		
		// Arrays/Complex
		expect(cn("text-red-500", ["bg-blue-500", { "text-green-500": true }])).toBe("bg-blue-500 text-green-500");
	});
});
