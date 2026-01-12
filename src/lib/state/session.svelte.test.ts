import { describe, it, expect, beforeEach } from "vitest";
import { session, type SessionUser } from "./session.svelte";

const mockUser: SessionUser = { id: "u1", email: "test@example.com", username: "test", role: "staff", tenantId: "t1", facilityId: "f1" };

beforeEach(() => session.clear());

describe("session", () => {
	it("starts unauthenticated", () => { expect(session.isAuthenticated).toBe(false); expect(session.user).toBeNull(); });
	it("setUser authenticates", () => { session.setUser(mockUser); expect(session.isAuthenticated).toBe(true); expect(session.user?.id).toBe("u1"); expect(session.loading).toBe(false); expect(session.initialized).toBe(true); });
	it("clear logs out", () => { session.setUser(mockUser); session.clear(); expect(session.isAuthenticated).toBe(false); expect(session.user).toBeNull(); });
	it("setUser(null) clears", () => { session.setUser(mockUser); session.setUser(null); expect(session.isAuthenticated).toBe(false); });
});
