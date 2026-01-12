import { describe, it, expect, beforeEach } from "vitest";
import { session, type SessionUser } from "./session.svelte";

const mockUser: SessionUser = { id: "u1", email: "test@example.com", username: "test", role: "staff", tenantId: "t1", facilityId: "f1" };

beforeEach(() => session.clear());

describe("session", () => {
	it("starts unauthenticated", () => { expect(session.isAuthenticated).toBe(false); });
	it("setUser authenticates", () => { session.setUser(mockUser); expect(session.isAuthenticated).toBe(true); expect(session.user?.id).toBe("u1"); });
	it("clear logs out", () => { session.setUser(mockUser); session.clear(); expect(session.isAuthenticated).toBe(false); });
});
