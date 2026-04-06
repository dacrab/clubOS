import type { SessionUser } from "$lib/types/database";

function createSession() {
	let user = $state<SessionUser | null>(null);
	let loading = $state(true);
	let initialized = $state(false);

	return {
		get user() { return user; },
		get loading() { return loading; },
		get initialized() { return initialized; },
		get isAuthenticated() { return user !== null; },
		setUser(u: SessionUser | null) {
			user = u;
			loading = false;
			initialized = true;
		},
		clear() {
			user = null;
			loading = false;
		},
	};
}

export const session = createSession();
