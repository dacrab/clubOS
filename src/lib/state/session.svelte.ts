export type UserRole = "admin" | "secretary" | "staff";

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

	get isAdmin(): boolean {
		return this.user?.role === "admin";
	}

	get isSecretary(): boolean {
		return this.user?.role === "secretary";
	}

	get isStaff(): boolean {
		return this.user?.role === "staff";
	}

	get canAccessAdmin(): boolean {
		return this.isAdmin;
	}

	get canAccessSecretary(): boolean {
		return this.isAdmin || this.isSecretary;
	}

	get canAccessStaff(): boolean {
		return this.isAdmin || this.isStaff;
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
		case "admin":
			return "/admin";
		case "secretary":
			return "/secretary";
		case "staff":
			return "/staff";
		default:
			return "/";
	}
}
