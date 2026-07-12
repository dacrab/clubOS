import { describe, expect, it } from "vitest";
import type { OrderItemView } from "$lib/types/database";
import {
	getActiveOrderItems,
	getBookingStatusBadgeVariant,
	getProductName,
	getRoleBadgeVariant,
	shortId,
} from "./helpers";

describe("getRoleBadgeVariant", () => {
	it.each([
		["owner", "destructive"],
		["admin", "default"],
		["manager", "secondary"],
		["staff", "outline"],
	] as const)("maps %s -> %s", (role, variant) => {
		expect(getRoleBadgeVariant(role)).toBe(variant);
	});

	it("defaults to outline for undefined role", () => {
		expect(getRoleBadgeVariant(undefined)).toBe("outline");
	});
});

describe("getBookingStatusBadgeVariant", () => {
	it.each([
		["confirmed", "success"],
		["canceled", "destructive"],
		["no_show", "warning"],
		["pending", "secondary"],
		["completed", "secondary"],
	] as const)("maps %s -> %s", (status, variant) => {
		expect(getBookingStatusBadgeVariant(status)).toBe(variant);
	});

	it("defaults to secondary for undefined status", () => {
		expect(getBookingStatusBadgeVariant(undefined)).toBe("secondary");
	});
});

describe("shortId", () => {
	it("returns the first 8 characters", () => {
		expect(shortId("abcdef1234567890")).toBe("abcdef12");
	});

	it("handles ids shorter than 8 characters", () => {
		expect(shortId("abc")).toBe("abc");
	});
});

describe("getProductName", () => {
	it("returns the product name", () => {
		expect(getProductName({ id: "p1", name: "Soda" })).toBe("Soda");
	});

	it("falls back to Unknown for null", () => {
		expect(getProductName(null)).toBe("Unknown");
	});
});

describe("getActiveOrderItems", () => {
	const item = (id: string, is_deleted: boolean): OrderItemView => ({
		id,
		quantity: 1,
		unit_price: 1,
		line_total: 1,
		is_treat: false,
		is_deleted,
		products: { id, name: id },
	});

	it("filters out soft-deleted items", () => {
		const items = [item("a", false), item("b", true), item("c", false)];
		expect(getActiveOrderItems(items).map((i) => i.id)).toEqual(["a", "c"]);
	});

	it("returns an empty array for null input", () => {
		expect(getActiveOrderItems(null)).toEqual([]);
	});
});
