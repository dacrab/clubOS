import type { SessionUser } from "$lib/types/database";

function createSession() {
	let user = $state<SessionUser | null>(null);
	let loading = $state(true);

	return {
		get user() { return user; },
		get loading() { return loading; },
		get isAuthenticated() { return user !== null; },
		setUser(u: SessionUser | null) {
			user = u;
			loading = false;
		},
		clear() {
			user = null;
			loading = false;
		},
	};
}

export const session = createSession();
