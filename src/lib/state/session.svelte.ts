import type { SessionUser } from "$lib/types/database";

let user = $state<SessionUser | null>(null);

export const session = {
	get user() {
		return user;
	},
	setUser(u: SessionUser | null) {
		user = u;
	},
};
