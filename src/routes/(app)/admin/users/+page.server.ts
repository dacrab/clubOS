import { and, eq, isNull, or } from "drizzle-orm";
import { clerkClient } from "svelte-clerk/server";
import { getDb } from "$lib/db/client";
import { memberships } from "$lib/db/schema/memberships";
import { users } from "$lib/db/schema/users";
import { USERS_PER_PAGE } from "$lib/types/database";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();
	const db = getDb();

	const rows = await db
		.select({ userId: memberships.userId, role: memberships.role, fullName: users.fullName })
		.from(memberships)
		.innerJoin(users, eq(users.id, memberships.userId))
		.where(
			and(
				eq(memberships.tenantId, user.tenantId ?? ""),
				user.facilityId
					? or(isNull(memberships.facilityId), eq(memberships.facilityId, user.facilityId))
					: undefined,
			),
		);

	if (!rows.length) return { users: [] };

	// Fetch Clerk profiles only for this tenant's members so a globally
	// paginated user list can't truncate emails for users beyond page 1.
	const userIds = rows.map((r) => r.userId);
	const client = clerkClient;
	const clerkUsers = await client.users.getUserList({
		userId: userIds,
		limit: Math.max(USERS_PER_PAGE, userIds.length),
	});
	const emailMap = new Map(
		clerkUsers.data.map((u) => [u.id, u.emailAddresses[0]?.emailAddress ?? ""]),
	);

	const usersList = rows.map((u) => ({
		id: u.userId,
		email: emailMap.get(u.userId) ?? "",
		full_name: u.fullName,
		role: u.role,
	}));

	return { users: usersList };
};
