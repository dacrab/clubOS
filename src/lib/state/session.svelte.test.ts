import { describe, it, expect, beforeEach } from "vitest";
import { session } from "./session.svelte";
import type { SessionUser } from "$lib/types/database";

const mockUser: SessionUser = {
	id: "u1",
	email: "test@example.com",
	username: "test",
	role: "staff",
	tenantId: "t1",
	facilityId: "f1",
};

describe("session", () => {
	beforeEach(() => session.clear());

	it("starts unauthenticated", () => {
		expect(session.isAuthenticated).toBe(false);
		expect(session.user).toBeNull();
	});

	it("setUser authenticates", () => {
		session.setUser(mockUser);
		expect(session.isAuthenticated).toBe(true);
		expect(session.user).toStrictEqual(mockUser);
	});

	it("setUser(null) clears", () => {
		session.setUser(mockUser);
		session.setUser(null);
		expect(session.user).toBeNull();
		expect(session.isAuthenticated).toBe(false);
	});

	it("clear logs out", () => {
		session.setUser(mockUser);
		session.clear();
		expect(session.user).toBeNull();
		expect(session.isAuthenticated).toBe(false);
	});
});
