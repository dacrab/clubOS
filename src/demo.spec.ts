import { describe, expect, it } from "vitest";

describe("sum test", () => {
	it("adds 1 + 2 to equal 3", () => {
		const ONE = 1;
		const TWO = 2;
		const EXPECTED_SUM = 3;
		expect(ONE + TWO).toBe(EXPECTED_SUM);
	});
});
