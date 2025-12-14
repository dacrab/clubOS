import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BookingType } from "$lib/types/database";
import { loadBookings } from "./bookings";

type QueryBuilderStub = {
	select: (...args: unknown[]) => QueryBuilderStub;
	eq: (...args: unknown[]) => QueryBuilderStub;
	order: (...args: unknown[]) => Promise<{ data: unknown | null; error: null }>;
};

const createSupabaseStub = (responseData: unknown | null): { from: SupabaseClient["from"]; queryBuilder: QueryBuilderStub } => {
	const queryBuilder: QueryBuilderStub = {
		select: vi.fn(),
		eq: vi.fn(),
		order: vi.fn(),
	};

	queryBuilder.select = vi.fn().mockReturnValue(queryBuilder);
	queryBuilder.eq = vi.fn().mockReturnValue(queryBuilder);
	queryBuilder.order = vi.fn().mockResolvedValue({ data: responseData, error: null });

	const from = vi.fn().mockReturnValue(queryBuilder) as unknown as SupabaseClient["from"];

	return { from, queryBuilder };
};

describe("loadBookings", () => {
	it("loads bookings filtered by type in ascending start order", async () => {
		const mockBookings = [
			{ id: "1", type: "football", starts_at: "2024-01-01T10:00:00Z" },
			{ id: "2", type: "football", starts_at: "2024-01-01T11:00:00Z" },
		];
		const { from, queryBuilder } = createSupabaseStub(mockBookings);

		const result = await loadBookings({ from } as unknown as SupabaseClient, "football" as BookingType);

		expect(from).toHaveBeenCalledWith("bookings");
		expect(queryBuilder.select).toHaveBeenCalledWith("*");
		expect(queryBuilder.eq).toHaveBeenCalledWith("type", "football");
		expect(queryBuilder.order).toHaveBeenCalledWith("starts_at", { ascending: true });
		expect(result.bookings).toEqual(mockBookings);
	});

	it("returns empty array when query returns null data", async () => {
		const { from } = createSupabaseStub(null);

		const result = await loadBookings({ from } as unknown as SupabaseClient, "birthday" as BookingType);

		expect(result.bookings).toEqual([]);
	});
});
