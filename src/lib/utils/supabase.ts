import { createClient } from "@supabase/supabase-js";
import { env as publicEnv } from "$env/dynamic/public";

const { PUBLIC_SUPABASE_URL: url, PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: anonKey } =
	publicEnv as {
		PUBLIC_SUPABASE_URL?: string;
		PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?: string;
	};

if (!(url && anonKey)) {
	throw new Error("Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY");
}

export const supabase = createClient(url, anonKey);

// Keep server and client in sync: when auth state changes on the client,
// update the HTTP-only cookies on the server so SSR sees the session on reload.
if (typeof window !== "undefined") {
	const postAuthCallback = async (
		event: string,
		session: { access_token: string; refresh_token: string } | null,
	): Promise<void> => {
		// Only sync for meaningful events
		const shouldSync =
			event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "SIGNED_OUT";
		if (!shouldSync) return;
		try {
			await fetch("/auth/callback", {
				method: "POST",
				headers: { "content-type": "application/json" },
				credentials: "same-origin",
				body: JSON.stringify({ event, session }),
			});
		} catch {
			// ignore network errors; a subsequent navigation will retry
		}
	};

	// Register once per page load
	let initialized = false;
	if (!initialized) {
		initialized = true;
		supabase.auth.onAuthStateChange((event, session) => {
			// session can be null on SIGNED_OUT
			const payload = session
				? {
						access_token: session.access_token,
						refresh_token: session.refresh_token,
					}
				: null;
			void postAuthCallback(event, payload);
		});
	}
}
