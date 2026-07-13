import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "$env/dynamic/private";

let client: SupabaseClient | undefined;

export function getSupabaseAdmin(): SupabaseClient {
	const url: string | undefined = env.SUPABASE_URL;
	const key: string | undefined = env.SUPABASE_SECRET_KEY;
	if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY");
	if (!client) {
		client = createClient(url, key, {
			auth: { persistSession: false, autoRefreshToken: false },
		});
	}
	return client;
}
