import { describe, expect, it, vi } from "vitest";

vi.mock("$env/dynamic/private", () => ({
	env: { BOOKING_TOKEN_SECRET: "test-secret-123" },
}));

describe("token utils", () => {
	it("generates and verifies a token", async () => {
		const { generateBookingToken, verifyBookingToken } = await import("./token");
		const id = "550e8400-e29b-41d4-a716-446655440000";
		const token = generateBookingToken(id);
		expect(token).toBeTruthy();
		expect(token.length).toBe(64);
		expect(verifyBookingToken(id, token)).toBe(true);
	});

	it("rejects wrong token", async () => {
		const { generateBookingToken, verifyBookingToken } = await import("./token");
		const token = generateBookingToken("id-1");
		expect(verifyBookingToken("id-2", token)).toBe(false);
	});

	it("returns false for malformed input", async () => {
		const { verifyBookingToken } = await import("./token");
		expect(verifyBookingToken("any", "")).toBe(false);
	});
});
