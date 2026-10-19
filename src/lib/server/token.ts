import { createHmac, timingSafeEqual } from "node:crypto";
import { DAY_MS } from "#lib/types/database.js";
import { BOOKING_TOKEN_SECRET } from "$app/env/private";

const DEFAULT_TTL_MS = 30 * DAY_MS;

function getSecret(): string {
	const secret = BOOKING_TOKEN_SECRET;
	if (!secret) throw new Error("Missing BOOKING_TOKEN_SECRET env var");
	return secret;
}

function sign(payload: string): string {
	return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function generateBookingToken(bookingId: string, ttlMs: number = DEFAULT_TTL_MS): string {
	const exp = Date.now() + ttlMs;
	return `${exp}.${sign(`${bookingId}.${exp}`)}`;
}

export function verifyBookingToken(bookingId: string, token: string): boolean {
	try {
		const dot = token.indexOf(".");
		if (dot <= 0) return false;
		const exp = Number(token.slice(0, dot));
		if (!Number.isFinite(exp) || Date.now() > exp) return false;
		const expected = sign(`${bookingId}.${exp}`);
		const a = Buffer.from(expected);
		const b = Buffer.from(token.slice(dot + 1));
		return a.length === b.length && timingSafeEqual(a, b);
	} catch {
		return false;
	}
}
