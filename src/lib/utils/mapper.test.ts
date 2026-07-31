import { describe, expect, it } from "vitest";
import { mapRow, mapRows } from "./mapper";

describe("mapRow", () => {
	it("converts camelCase keys to snake_case", () => {
		const row = { firstName: "John", lastName: "Doe", dateOfBirth: "1990-01-01" };
		const result = mapRow<Record<string, unknown>>(row);
		expect(result).toEqual({
			first_name: "John",
			last_name: "Doe",
			date_of_birth: "1990-01-01",
		});
	});

	it("preserves already-snake_case keys", () => {
		const row = { first_name: "John", last_name: "Doe" };
		const result = mapRow<Record<string, unknown>>(row);
		expect(result).toEqual({ first_name: "John", last_name: "Doe" });
	});

	it("handles an empty object", () => {
		expect(mapRow<Record<string, unknown>>({})).toEqual({});
	});

	it("preserves values as-is", () => {
		const row = { count: 42, active: true, data: null };
		const result = mapRow<Record<string, unknown>>(row);
		expect(result).toEqual({ count: 42, active: true, data: null });
	});
});

describe("mapRows", () => {
	it("maps an array of rows", () => {
		const rows = [
			{ fullName: "Alice", userAge: 30 },
			{ fullName: "Bob", userAge: 25 },
		];
		const result = mapRows<Record<string, unknown>>(rows);
		expect(result).toEqual([
			{ full_name: "Alice", user_age: 30 },
			{ full_name: "Bob", user_age: 25 },
		]);
	});

	it("returns an empty array for empty input", () => {
		expect(mapRows<Record<string, unknown>>([])).toEqual([]);
	});
});
