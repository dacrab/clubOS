import { describe, expect, it } from "vitest";
import { computePadding, computeWindow } from "./virtualization";

describe("virtualization", () => {
	const opts = {
		rowHeight: 50,
		viewBufferRows: 4,
		viewportHeight: 500,
	};

	it("computes window correctly for start of list", () => {
		const { startIndex, endIndex } = computeWindow(0, 100, opts);
		expect(startIndex).toBe(0);
		// Visible rows = 500/50 = 10. Buffer = 4. End index ~ 14
		expect(endIndex).toBeGreaterThanOrEqual(10);
	});

	it("computes window correctly for middle of list", () => {
		const scrollTop = 1000; // 20 rows down
		const { startIndex, endIndex } = computeWindow(scrollTop, 100, opts);
		// Start index should be around 20 - (4/2) = 18
		expect(startIndex).toBeLessThanOrEqual(20);
		expect(endIndex).toBeGreaterThan(20);
	});

	it("computes padding correctly", () => {
		const { topPad, bottomPad } = computePadding(10, 50, 100, 50);
		expect(topPad).toBe(500);
		// 100 - 50 = 50. 50 * 50 = 2500
		expect(bottomPad).toBe(2500);
	});
});
