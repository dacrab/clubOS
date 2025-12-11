/**
 * Session State Management
 * Handles user authentication state and role-based access control
 */

// Role hierarchy: owner > admin > manager > staff
export type UserRole = "owner" | "admin" | "manager" | "staff";

export type SessionUser = {
	id: string;
	email: string;
	username: string;
	role: UserRole;
	tenantId: string | null;
	facilityId: string | null;
};

class SessionState {
	user = $state<SessionUser | null>(null);
	loading = $state(true);
	initialized = $state(false);

	get isAuthenticated(): boolean {
		return this.user !== null;
	}

	// Role checks
	get isOwner(): boolean {
		return this.user?.role === "owner";
	}

	get isAdmin(): boolean {
		return this.user?.role === "admin";
	}

	get isManager(): boolean {
		return this.user?.role === "manager";
	}

	get isStaff(): boolean {
		return this.user?.role === "staff";
	}

	// Access level checks (hierarchical)
	get canAccessAdmin(): boolean {
		return this.isOwner || this.isAdmin;
	}

	get canAccessSecretary(): boolean {
		return this.isOwner || this.isAdmin || this.isManager;
	}

	get canAccessStaff(): boolean {
		// All authenticated users can access staff area
		return this.isAuthenticated;
	}

	// Permission helpers
	get canManageUsers(): boolean {
		return this.isOwner || this.isAdmin;
	}

	get canManageSettings(): boolean {
		return this.isOwner || this.isAdmin;
	}

	get canManageProducts(): boolean {
		return this.isOwner || this.isAdmin;
	}

	get canManageBookings(): boolean {
		return this.isOwner || this.isAdmin || this.isManager;
	}

	get canProcessOrders(): boolean {
		// All staff can process orders
		return this.isAuthenticated;
	}

	setUser(user: SessionUser | null): void {
		this.user = user;
		this.loading = false;
		this.initialized = true;
	}

	clear(): void {
		this.user = null;
		this.loading = false;
	}
}

export const session = new SessionState();

export function getHomePathForRole(role: UserRole | null): string {
	switch (role) {
		case "owner":
		case "admin":
			return "/admin";
		case "manager":
			return "/secretary";
		case "staff":
		default:
			return "/staff";
	}
}
