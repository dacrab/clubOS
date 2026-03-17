import { describe, it, expect, beforeEach } from "vitest";
import { session, type SessionUser } from "./session.svelte";

const mockUser: SessionUser = {
	id: "u1",
	email: "test@example.com",
	username: "test",
	role: "staff",
	tenantId: "t1",
	facilityId: "f1",
};

describe("session", () => {
	describe("initial state", () => {
		it("starts unauthenticated", () => {
			expect(session.isAuthenticated).toBe(false);
		});

		it("starts with loading = true", () => {
			// Fresh session before clear() starts with loading true
			expect(session.loading).toBe(true);
		});

		it("starts with initialized = false", () => {
			expect(session.initialized).toBe(false);
		});

		it("starts with no user", () => {
			expect(session.user).toBeNull();
		});
	});

	describe("setUser", () => {
		beforeEach(() => session.clear());

		it("sets user and authenticates", () => {
			session.setUser(mockUser);
			expect(session.isAuthenticated).toBe(true);
			expect(session.user).toStrictEqual(mockUser);
		});

		it("sets loading to false after setUser", () => {
			session.setUser(mockUser);
			expect(session.loading).toBe(false);
		});

		it("sets initialized to true after setUser", () => {
			session.setUser(mockUser);
			expect(session.initialized).toBe(true);
		});

		it("makes all SessionUser fields accessible", () => {
			session.setUser(mockUser);
			const user = session.user;
			expect(user?.id).toBe("u1");
			expect(user?.email).toBe("test@example.com");
			expect(user?.username).toBe("test");
			expect(user?.role).toBe("staff");
			expect(user?.tenantId).toBe("t1");
			expect(user?.facilityId).toBe("f1");
		});

		it("setUser(null) clears user and sets isAuthenticated to false", () => {
			session.setUser(mockUser);
			expect(session.isAuthenticated).toBe(true);

			session.setUser(null);
			expect(session.user).toBeNull();
			expect(session.isAuthenticated).toBe(false);
		});

		it("setUser(null) sets loading to false", () => {
			session.setUser(mockUser);
			session.setUser(null);
			expect(session.loading).toBe(false);
		});

		it("setUser(null) sets initialized to true", () => {
			session.setUser(mockUser);
			session.setUser(null);
			expect(session.initialized).toBe(true);
		});
	});

	describe("clear", () => {
		beforeEach(() => session.clear());

		it("clears user", () => {
			session.setUser(mockUser);
			session.clear();
			expect(session.user).toBeNull();
		});

		it("logs out by setting isAuthenticated to false", () => {
			session.setUser(mockUser);
			session.clear();
			expect(session.isAuthenticated).toBe(false);
		});

		it("sets loading to false", () => {
			session.setUser(mockUser);
			session.clear();
			expect(session.loading).toBe(false);
		});

		it("does not reset initialized", () => {
			session.setUser(mockUser);
			expect(session.initialized).toBe(true);
			session.clear();
			// clear() does not reset initialized, only sets loading to false
			expect(session.initialized).toBe(true);
		});
	});
});
