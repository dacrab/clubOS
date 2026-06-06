import { createClient } from "@supabase/supabase-js";
import { browser } from "$app/environment";
import { env } from "$env/dynamic/public";

const { PUBLIC_SUPABASE_URL: url, PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: anonKey } = env as {
	PUBLIC_SUPABASE_URL?: string;
	PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?: string;
};

if (!url) throw new Error("Missing PUBLIC_SUPABASE_URL");
if (!anonKey) throw new Error("Missing PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY");

export const supabase = createClient(url, anonKey);

const SYNCED_EVENTS = new Set(["SIGNED_IN", "TOKEN_REFRESHED", "SIGNED_OUT"]);

if (browser) {
	supabase.auth.onAuthStateChange((event, session) => {
		if (!SYNCED_EVENTS.has(event)) return;
		const payload = session
			? { access_token: session.access_token, refresh_token: session.refresh_token }
			: null;
		fetch("/auth/callback", {
			method: "POST",
			headers: { "content-type": "application/json" },
			credentials: "same-origin",
			body: JSON.stringify({ event, session: payload }),
		}).catch((_err) => {});
	});
}
