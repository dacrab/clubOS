import { createClient } from "@supabase/supabase-js";
import { env } from "$env/dynamic/public";
import { browser } from "$app/environment";

const { PUBLIC_SUPABASE_URL: url, PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: anonKey } = env as { PUBLIC_SUPABASE_URL?: string; PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?: string };

if (!(url && anonKey)) throw new Error("Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY");

export const supabase = createClient(url, anonKey);

if (browser) {
	supabase.auth.onAuthStateChange((event, session) => {
		if (!["SIGNED_IN", "TOKEN_REFRESHED", "SIGNED_OUT"].includes(event)) return;
		
		const payload = session ? { access_token: session.access_token, refresh_token: session.refresh_token } : null;
		fetch("/auth/callback", {
			method: "POST",
			headers: { "content-type": "application/json" },
			credentials: "same-origin",
			body: JSON.stringify({ event, session: payload }),
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		}).catch(() => {});
	});
}
