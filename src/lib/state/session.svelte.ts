/**
 * Session State Management
 */

import type { MemberRole } from "$lib/types/database";

export type SessionUser = {
	id: string;
	email: string;
	username: string;
	role: MemberRole;
	tenantId: string | null;
	facilityId: string | null;
};

class SessionState {
	user = $state<SessionUser | null>(null);
	loading = $state(true);
	initialized = $state(false);

	get isAuthenticated(): boolean { return this.user !== null; }

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
