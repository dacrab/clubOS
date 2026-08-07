import type { SessionUser } from "$lib/types/database";

let user = $state<SessionUser | null>(null);

export const session = {
	get user() {
		return user;
	},
	get isAuthenticated() {
		return user !== null;
	},
	setUser(u: SessionUser | null) {
		user = u;
	},
	clear() {
		user = null;
	},
};
