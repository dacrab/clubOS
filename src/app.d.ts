import type { MemberRole } from "$lib/types/database";

declare global {
	namespace App {
		interface Locals {
			auth:
				| import("svelte-clerk/server").AuthObject
				| ((opts?: import("@clerk/backend").AuthObject) => import("@clerk/backend").AuthObject);
			userId: string | null;
			userCtx: UserContext | null;
		}

		interface UserContext {
			membership: {
				role: MemberRole;
				tenantId: string;
				facilityId: string | null;
			} | null;
			profile: { fullName: string | null } | null;
			tenant: { settings: Record<string, unknown> } | null;
			subscription: Record<string, unknown> | null;
			activeSession: { id: string; opened_at?: string; opening_cash?: string } | null;
		}
	}
}
