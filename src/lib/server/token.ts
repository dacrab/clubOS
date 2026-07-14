import { createHash, timingSafeEqual } from "node:crypto";
import { env } from "$env/dynamic/private";

function getSecret(): string {
	const secret = env.BOOKING_TOKEN_SECRET;
	if (!secret) throw new Error("Missing BOOKING_TOKEN_SECRET env var");
	return secret;
}

export function generateBookingToken(bookingId: string): string {
	return createHash("sha256")
		.update(bookingId + getSecret())
		.digest("hex");
}

export function verifyBookingToken(bookingId: string, token: string): boolean {
	try {
		const expected = generateBookingToken(bookingId);
		const a = Buffer.from(expected);
		const b = Buffer.from(token);
		return a.length === b.length && timingSafeEqual(a, b);
	} catch {
		return false;
	}
}
