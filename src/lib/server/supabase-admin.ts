import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import { env as privateEnv } from "$env/dynamic/private";

let cachedClient: SupabaseClient | undefined;

export function getSupabaseAdmin(): SupabaseClient {
	const { SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey } =
		privateEnv as {
			SUPABASE_URL?: string;
			SUPABASE_SERVICE_ROLE_KEY?: string;
		};

	if (!(url && serviceRoleKey)) {
		throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
	}

	if (!cachedClient) {
		cachedClient = createClient(url, serviceRoleKey, {
			auth: { persistSession: false, autoRefreshToken: false },
		});
	}

	return cachedClient;
}
