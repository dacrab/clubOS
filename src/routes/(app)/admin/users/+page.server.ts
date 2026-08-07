import { eq } from "drizzle-orm";
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
		.where(eq(memberships.tenantId, user.tenantId ?? ""));

	if (!rows.length) return { users: [] };

	const client = clerkClient;
	const clerkUsers = await client.users.getUserList({ limit: USERS_PER_PAGE });
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
