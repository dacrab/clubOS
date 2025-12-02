import { describe, it, expect } from "vitest";
import { KEEP_ALIVE_CONFIG } from "./keep-alive-config";

describe("KEEP_ALIVE_CONFIG", () => {
	describe("structure", () => {
		it("should be defined", () => {
			expect(KEEP_ALIVE_CONFIG).toBeDefined();
		});

		it("should have table property", () => {
			expect(KEEP_ALIVE_CONFIG.table).toBeDefined();
			expect(typeof KEEP_ALIVE_CONFIG.table).toBe("string");
		});

		it("should have searchColumn property", () => {
			expect(KEEP_ALIVE_CONFIG.searchColumn).toBeDefined();
			expect(typeof KEEP_ALIVE_CONFIG.searchColumn).toBe("string");
		});

		it("should have runInsertDelete property", () => {
			expect(KEEP_ALIVE_CONFIG.runInsertDelete).toBeDefined();
			expect(typeof KEEP_ALIVE_CONFIG.runInsertDelete).toBe("boolean");
		});

		it("should have listCount property", () => {
			expect(KEEP_ALIVE_CONFIG.listCount).toBeDefined();
			expect(typeof KEEP_ALIVE_CONFIG.listCount).toBe("number");
		});

		it("should have otherEndpoints property as array", () => {
			expect(KEEP_ALIVE_CONFIG.otherEndpoints).toBeDefined();
			expect(Array.isArray(KEEP_ALIVE_CONFIG.otherEndpoints)).toBe(true);
		});
	});

	describe("values", () => {
		it("should have table set to 'keep-alive'", () => {
			expect(KEEP_ALIVE_CONFIG.table).toBe("keep-alive");
		});

		it("should have searchColumn set to 'name'", () => {
			expect(KEEP_ALIVE_CONFIG.searchColumn).toBe("name");
		});

		it("should have runInsertDelete enabled", () => {
			expect(KEEP_ALIVE_CONFIG.runInsertDelete).toBe(true);
		});

		it("should have listCount of 1", () => {
			expect(KEEP_ALIVE_CONFIG.listCount).toBe(1);
		});

		it("should have empty otherEndpoints array", () => {
			expect(KEEP_ALIVE_CONFIG.otherEndpoints).toHaveLength(0);
		});
	});

	describe("immutability checks", () => {
		it("should have consistent type for otherEndpoints elements", () => {
			// If there were elements, they should be strings
			KEEP_ALIVE_CONFIG.otherEndpoints.forEach((endpoint) => {
				expect(typeof endpoint).toBe("string");
			});
		});

		it("should have positive listCount", () => {
			expect(KEEP_ALIVE_CONFIG.listCount).toBeGreaterThan(0);
		});
	});
});
