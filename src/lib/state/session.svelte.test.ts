import { beforeEach, describe, expect, it } from "vitest";
import type { SessionUser } from "$lib/types/database";
import { session } from "./session.svelte";

const mockUser: SessionUser = {
	id: "u1",
	fullName: "Test User",
	role: "staff",
	tenantId: "t1",
	facilityId: "f1",
};

describe("session", () => {
	beforeEach(() => session.setUser(null));

	it("starts without a user", () => {
		expect(session.user).toBeNull();
	});

	it("setUser stores the user", () => {
		session.setUser(mockUser);
		expect(session.user).toStrictEqual(mockUser);
	});

	it("setUser(null) clears the user", () => {
		session.setUser(mockUser);
		session.setUser(null);
		expect(session.user).toBeNull();
	});
});
