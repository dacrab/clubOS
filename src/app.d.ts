import type { MemberRole, RegisterSession } from "$lib/types/database";

declare global {
	namespace App {
		interface Locals {
			supabase: import("@supabase/supabase-js").SupabaseClient;
			user: import("@supabase/supabase-js").User | null;
			userCtx: UserContext | null;
		}

		interface UserContext {
			membership: {
				role: MemberRole | null;
				tenantId: string | null;
				facilityId: string | null;
			} | null;
			profile: { fullName?: string | null } | null;
			tenant: { settings: unknown | null } | null;
			subscription: unknown | null;
			activeSession: RegisterSession | null;
		}
	}
}
