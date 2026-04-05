import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "$env/dynamic/private";

let client: SupabaseClient | undefined;

export function getSupabaseAdmin(): SupabaseClient {
	const { SUPABASE_URL: url, SUPABASE_SECRET_KEY: key } = env as { SUPABASE_URL?: string; SUPABASE_SECRET_KEY?: string };
	if (!(url && key)) throw new Error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY");
	return (client ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }));
}
