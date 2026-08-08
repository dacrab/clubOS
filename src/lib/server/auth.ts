import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "$lib/db/client";
import { memberships } from "$lib/db/schema/memberships";
import { registerSessions } from "$lib/db/schema/register-sessions";
import { subscriptions } from "$lib/db/schema/subscriptions";
import { tenants } from "$lib/db/schema/tenants";
import { users } from "$lib/db/schema/users";
import type { MemberRole } from "$lib/types/database";

export const EMPTY_CTX: App.UserContext = {
	membership: null,
	profile: null,
	tenant: null,
	subscription: null,
	activeSession: null,
};

export async function resolveUserContext(userId: string): Promise<App.UserContext> {
	const db = getDb();

	const mems = await db
		.select({
			role: memberships.role,
			tenantId: memberships.tenantId,
			facilityId: memberships.facilityId,
			fullName: users.fullName,
			tenant: tenants,
			subscription: subscriptions,
		})
		.from(memberships)
		.where(and(eq(memberships.userId, userId), eq(memberships.isPrimary, true)))
		.leftJoin(tenants, eq(memberships.tenantId, tenants.id))
		.leftJoin(subscriptions, eq(memberships.tenantId, subscriptions.tenantId))
		.leftJoin(users, eq(memberships.userId, users.id))
		.limit(1);

	const memRow = mems[0];
	if (!memRow) return EMPTY_CTX;

	const activeSessions = await db
		.select()
		.from(registerSessions)
		.where(
			and(
				eq(registerSessions.facilityId, memRow.facilityId ?? ""),
				isNull(registerSessions.closedAt),
			),
		)
		.limit(1);

	const VALID_ROLES: readonly MemberRole[] = ["owner", "admin", "manager", "staff"];
	const role = VALID_ROLES.includes(memRow.role) ? memRow.role : "staff";

	return {
		membership: {
			role,
			tenantId: memRow.tenantId,
			facilityId: memRow.facilityId,
		},
		profile: memRow.fullName ? { fullName: memRow.fullName } : null,
		tenant: memRow.tenant ? { settings: memRow.tenant.settings } : null,
		subscription: memRow.subscription,
		activeSession: activeSessions[0] ?? null,
	};
}
