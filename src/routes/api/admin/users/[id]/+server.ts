import { and, eq } from "drizzle-orm";
import { clerkClient } from "svelte-clerk/server";
import { getDb } from "$lib/db/client";
import { memberships } from "$lib/db/schema/memberships";
import type { AdminCtx } from "$lib/server/admin-helpers";
import { requireAdmin } from "$lib/server/admin-helpers";
import type { RequestHandler } from "./$types";

async function deleteUser(id: string, ctx: AdminCtx): Promise<Response> {
	const db = getDb();
	const mems = await db
		.select({ tenantId: memberships.tenantId })
		.from(memberships)
		.where(and(eq(memberships.userId, id), eq(memberships.tenantId, ctx.tenantId)))
		.limit(1);

	if (!mems[0]) return new Response("User not found in your tenant", { status: 404 });

	await clerkClient.users.deleteUser(id);
	return new Response(null, { status: 204 });
}

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const ctx = await requireAdmin(locals.userId);
	if (ctx instanceof Response) return ctx;

	return deleteUser(params.id, ctx);
};
