import type { SessionUser } from "$lib/types/database";

export type { SessionUser };

function createSession(): {
	readonly user: SessionUser | null;
	readonly loading: boolean;
	readonly initialized: boolean;
	readonly isAuthenticated: boolean;
	setUser(u: SessionUser | null): void;
	clear(): void;
} {
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
