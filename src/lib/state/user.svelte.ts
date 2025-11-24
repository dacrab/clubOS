import { supabase } from "$lib/utils/supabase";

export type AppUser = {
	id: string;
	email: string | null;
	role: "admin" | "staff" | "secretary" | null;
	username: string | null;
	tenantIds: string[];
};

class UserState {
	current = $state<AppUser | null>(null);

	async load(): Promise<void> {
		const { data: sessionData } = await supabase.auth.getSession();
		const session = sessionData.session;
		if (!session) {
			this.current = null;
			return;
		}
		// Prefer auth metadata and only fall back to DB profile
		const metaRole =
			(session.user.user_metadata?.["role"] as
				| "admin"
				| "staff"
				| "secretary"
				| null
				| undefined) ?? null;
		const metaUsername =
			(session.user.user_metadata?.["username"] as string | null | undefined) ??
			session.user.email ??
			null;

		let profileRole: "admin" | "staff" | "secretary" | null = metaRole;
		let profileUsername: string | null = metaUsername;
		try {
			const { data: profile } = await supabase
				.from("users")
				.select("id, username, role")
				.eq("id", session.user.id)
				.maybeSingle();
			if (profile) {
				profileRole =
					(profile.role as "admin" | "staff" | "secretary") ?? profileRole;
				profileUsername =
					(profile.username as string | null) ?? profileUsername;
			}
		} catch {
			// ignore DB errors and keep metadata values
		}
		// load tenant memberships
		const { data: memberships } = await supabase
			.from("tenant_members")
			.select("tenant_id")
			.eq("user_id", session.user.id);

		const tenantIds = (memberships ?? []).map(
			(m) => (m as { tenant_id: string }).tenant_id,
		);

		// If no tenant membership, still keep the session and expose the user;
		// pages can handle empty tenantIds without forcing a logout loop.

		this.current = {
			id: session.user.id,
			email: session.user.email ?? null,
			role: profileRole,
			username: profileUsername,
			tenantIds,
		};
	}
}

export const userState = new UserState();
