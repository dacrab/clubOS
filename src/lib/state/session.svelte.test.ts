import { describe, it, expect, beforeEach } from "vitest";
import { session, type SessionUser, type UserRole, getHomePathForRole } from "./session.svelte";

const baseUser: SessionUser = {
	id: "user-1",
	email: "user@example.com",
	username: "test-user",
	role: "staff",
	tenantId: "tenant-1",
	facilityId: "facility-1",
};

const setRole = (role: UserRole): void => {
	session.setUser({ ...baseUser, role });
};

describe("SessionState", () => {
	beforeEach(() => {
		session.clear();
	});

	it("tracks authentication state", () => {
		expect(session.isAuthenticated).toBe(false);
		setRole("staff");
		expect(session.isAuthenticated).toBe(true);
	});

	it("exposes role-specific getters", () => {
		setRole("owner");
		expect(session.isOwner).toBe(true);
		expect(session.isAdmin).toBe(false);
		expect(session.isManager).toBe(false);
		expect(session.isStaff).toBe(false);

		setRole("admin");
		expect(session.isAdmin).toBe(true);
		expect(session.isOwner).toBe(false);

		setRole("manager");
		expect(session.isManager).toBe(true);
		expect(session.isStaff).toBe(false);

		setRole("staff");
		expect(session.isStaff).toBe(true);
	});

	it("implements hierarchical access checks", () => {
		setRole("owner");
		expect(session.canAccessAdmin).toBe(true);
		expect(session.canAccessSecretary).toBe(true);
		expect(session.canAccessStaff).toBe(true);
		expect(session.canManageUsers).toBe(true);
		expect(session.canManageSettings).toBe(true);
		expect(session.canManageProducts).toBe(true);
		expect(session.canManageBookings).toBe(true);
		expect(session.canProcessOrders).toBe(true);

		setRole("admin");
		expect(session.canAccessAdmin).toBe(true);
		expect(session.canAccessSecretary).toBe(true);
		expect(session.canAccessStaff).toBe(true);
		expect(session.canManageBookings).toBe(true);

		setRole("manager");
		expect(session.canAccessAdmin).toBe(false);
		expect(session.canAccessSecretary).toBe(true);
		expect(session.canAccessStaff).toBe(true);
		expect(session.canManageBookings).toBe(true);
		expect(session.canProcessOrders).toBe(true);

		setRole("staff");
		expect(session.canAccessAdmin).toBe(false);
		expect(session.canAccessSecretary).toBe(false);
		expect(session.canAccessStaff).toBe(true);
		expect(session.canManageBookings).toBe(false);
		expect(session.canProcessOrders).toBe(true);
	});

	it("clears session state", () => {
		setRole("admin");
		expect(session.isAuthenticated).toBe(true);

		session.clear();
		expect(session.isAuthenticated).toBe(false);
	});
});

describe("getHomePathForRole", () => {
	it("returns correct home path per role", () => {
		expect(getHomePathForRole("owner")).toBe("/admin");
		expect(getHomePathForRole("admin")).toBe("/admin");
		expect(getHomePathForRole("manager")).toBe("/secretary");
		expect(getHomePathForRole("staff")).toBe("/staff");
		expect(getHomePathForRole(null)).toBe("/staff");
	});
});
