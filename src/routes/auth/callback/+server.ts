import { createServerClient } from "@supabase/ssr";
import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import { env as publicEnv } from "$env/dynamic/public";

export const POST: RequestHandler = async ({ request, cookies, url }) => {
	const {
		PUBLIC_SUPABASE_URL: supabaseUrl,
		PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: supabaseAnonKey,
	} = publicEnv as {
		PUBLIC_SUPABASE_URL?: string;
		PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?: string;
	};

	if (!(supabaseUrl && supabaseAnonKey)) {
		return json({ success: false, error: "Missing PUBLIC_SUPABASE env" }, { status: 500 });
	}

	const { event, session } = (await request.json()) as {
		event?: string;
		session?: { access_token: string; refresh_token: string } | null;
	};

	const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
		cookies: {
			get: (key: string) => cookies.get(key),
			set: (key: string, value: string, options?: Record<string, unknown>) =>
				cookies.set(key, value, {
					...(options ?? {}),
					httpOnly: true,
					sameSite: "lax",
					secure: url.protocol === "https:",
					path: "/",
				}),
			remove: (key: string, options?: Record<string, unknown>) =>
				cookies.delete(key, { ...(options ?? {}), path: "/" }),
		},
	});

	if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
		if (session) {
			await supabase.auth.setSession({
				access_token: session.access_token,
				refresh_token: session.refresh_token,
			});
		}
	} else if (event === "SIGNED_OUT") {
		await supabase.auth.signOut();
	}

	return json({ success: true });
};
