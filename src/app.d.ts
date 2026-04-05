declare global {
	namespace App {
		interface Locals {
			supabase: import("@supabase/supabase-js").SupabaseClient;
			user: import("@supabase/supabase-js").User | null;
		}
	}
}

export {};
