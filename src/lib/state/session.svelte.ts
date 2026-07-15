import type { SessionUser } from "$lib/types/database";

function createSession(): {
	readonly user: SessionUser | null;
	readonly isAuthenticated: boolean;
	setUser: (u: SessionUser | null) => void;
	clear: () => void;
} {
	let user = $state<SessionUser | null>(null);

	return {
		get user() {
			return user;
		},
		get isAuthenticated() {
			return user !== null;
		},
		setUser(u) {
			user = u;
		},
		clear() {
			user = null;
		},
	};
}

export const session = createSession();
