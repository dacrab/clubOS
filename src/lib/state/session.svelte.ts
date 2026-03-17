import type { MemberRole } from "$lib/types/database";

export type SessionUser = {
	id: string;
	email: string;
	username: string;
	role: MemberRole;
	tenantId: string | null;
	facilityId: string | null;
};

function createSession() {
	let user = $state<SessionUser | null>(null);
	let loading = $state(true);
	let initialized = $state(false);

	return {
		get user() { return user; },
		get loading() { return loading; },
		get initialized() { return initialized; },
		get isAuthenticated() { return user !== null; },
		setUser(u: SessionUser | null): void {
			user = u;
			loading = false;
			initialized = true;
		},
		clear(): void {
			user = null;
			loading = false;
		},
	};
}

export const session = createSession();
