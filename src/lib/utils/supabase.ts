import { createClient } from "@supabase/supabase-js";
import { browser } from "$app/environment";
import { env } from "$env/dynamic/public";

const url = env.PUBLIC_SUPABASE_URL;
const anonKey = env.PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!url) throw new Error("Missing PUBLIC_SUPABASE_URL");
if (!anonKey) throw new Error("Missing PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY");

export const supabase = createClient(url, anonKey);

const SYNCED_EVENTS = new Set(["SIGNED_IN", "TOKEN_REFRESHED", "SIGNED_OUT"]);

if (browser) {
	const {
		data: { subscription },
	} = supabase.auth.onAuthStateChange((event, session) => {
		if (!SYNCED_EVENTS.has(event)) return;
		const payload = session
			? { access_token: session.access_token, refresh_token: session.refresh_token }
			: null;
		fetch("/auth/callback", {
			method: "POST",
			headers: { "content-type": "application/json" },
			credentials: "same-origin",
			body: JSON.stringify({ event, session: payload }),
		}).catch((err) => {
			// biome-ignore lint/suspicious/noConsole: intentional error logging for auth sync failures
			console.error("Auth sync failed", err);
		});
	});

	if (import.meta.hot) {
		import.meta.hot.dispose(() => {
			subscription.unsubscribe();
		});
	}
}
