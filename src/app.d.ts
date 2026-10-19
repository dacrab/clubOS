import type { TenantSettings } from "#lib/config/settings.js";
import type { registerSessions } from "#lib/db/schema/register-sessions.js";
import type { subscriptions } from "#lib/db/schema/subscriptions.js";
import type { MemberRole } from "#lib/types/database.js";

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
			tenant: { settings: Partial<TenantSettings> } | null;
			subscription: typeof subscriptions.$inferSelect | null;
			activeSession: typeof registerSessions.$inferSelect | null;
		}
	}
}
