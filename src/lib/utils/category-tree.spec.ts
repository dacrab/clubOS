import { describe, expect, it } from "vitest";
import { collectWithDescendants } from "./category-tree";

describe("category-tree", () => {
	it("should collect descendant IDs correctly", () => {
		const categories = [
			{ id: "1", name: "Root", parent_id: null },
			{ id: "2", name: "Child 1", parent_id: "1" },
			{ id: "3", name: "Child 2", parent_id: "1" },
			{ id: "4", name: "Grandchild 1", parent_id: "2" },
			{ id: "5", name: "Unrelated", parent_id: null },
		];

		const result = collectWithDescendants(categories, "1");
		expect(result.has("1")).toBe(true);
		expect(result.has("2")).toBe(true);
		expect(result.has("3")).toBe(true);
		expect(result.has("4")).toBe(true);
		expect(result.has("5")).toBe(false);
	});
});
