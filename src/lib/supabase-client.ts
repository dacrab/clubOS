import { createClient } from "@supabase/supabase-js";
import { env as publicEnv } from "$env/dynamic/public";

const { PUBLIC_SUPABASE_URL: url, PUBLIC_SUPABASE_ANON_KEY: anonKey } =
  publicEnv as {
    PUBLIC_SUPABASE_URL?: string;
    PUBLIC_SUPABASE_ANON_KEY?: string;
  };

if (!(url && anonKey)) {
  throw new Error("Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_ANON_KEY");
}

export const supabase = createClient(url, anonKey);
