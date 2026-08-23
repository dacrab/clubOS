import { and, eq } from "drizzle-orm";
import { clerkClient } from "svelte-clerk/server";
import type { z } from "zod";
import { getDb } from "$lib/db/client";
import { memberships } from "$lib/db/schema/memberships";
import { users } from "$lib/db/schema/users";
import { AdminUserCreateSchema, AdminUserDeleteSchema, AdminUserUpdateSchema } from "$lib/schemas";
import { type AdminCtx, canAssign, requireAdmin } from "$lib/server/admin-helpers";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, locals }) => {
	const ctx = await requireAdmin(locals.userId);
	if (ctx instanceof Response) return ctx;

	const parsed = AdminUserCreateSchema.safeParse(await request.json().catch(() => ({})));
	if (!parsed.success) return new Response("Missing required fields", { status: 400 });

	const { email, fullName, password, role } = parsed.data;
	if (!canAssign(ctx.callerRole, role))
		return new Response("Cannot assign higher privileges", { status: 403 });

	const client = clerkClient;
	const clerkUser = await client.users.createUser({
		emailAddress: [email],
		password,
		publicMetadata: { role },
	});

	await getDb().insert(users).values({ id: clerkUser.id, fullName }).onConflictDoNothing();

	await getDb().insert(memberships).values({
		userId: clerkUser.id,
		tenantId: ctx.tenantId,
		role: role,
		isPrimary: true,
	});

	return Response.json({ id: clerkUser.id });
};

async function updateUser(
	id: string,
	ctx: AdminCtx,
	data: z.infer<typeof AdminUserUpdateSchema>,
): Promise<Response> {
	const db = getDb();
	const mems = await db
		.select({ tenantId: memberships.tenantId })
		.from(memberships)
		.where(and(eq(memberships.userId, id), eq(memberships.tenantId, ctx.tenantId)))
		.limit(1);
	if (!mems[0]) return new Response("User not found in your tenant", { status: 404 });

	const { fullName, role, password } = data;
	if (role && !canAssign(ctx.callerRole, role))
		return new Response("Cannot assign higher privileges", { status: 403 });

	if (password) await clerkClient.users.updateUser(id, { password });

	if (fullName) await db.update(users).set({ fullName }).where(eq(users.id, id));
	if (role)
		await db
			.update(memberships)
			.set({ role })
			.where(and(eq(memberships.userId, id), eq(memberships.tenantId, ctx.tenantId)));

	return new Response(null, { status: 204 });
}

export const PATCH: RequestHandler = async ({ request, locals }) => {
	const ctx = await requireAdmin(locals.userId);
	if (ctx instanceof Response) return ctx;

	const parsed = AdminUserUpdateSchema.safeParse(await request.json().catch(() => ({})));
	if (!parsed.success) return new Response("Missing required fields", { status: 400 });

	return updateUser(parsed.data.id, ctx, parsed.data);
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
	const ctx = await requireAdmin(locals.userId);
	if (ctx instanceof Response) return ctx;

	const parsed = AdminUserDeleteSchema.safeParse(await request.json().catch(() => ({})));
	if (!parsed.success) return new Response("Missing id", { status: 400 });

	const db = getDb();
	const mems = await db
		.select({ tenantId: memberships.tenantId })
		.from(memberships)
		.where(and(eq(memberships.userId, parsed.data.id), eq(memberships.tenantId, ctx.tenantId)))
		.limit(1);

	if (!mems[0]) return new Response("User not found in your tenant", { status: 404 });

	await clerkClient.users.deleteUser(parsed.data.id);
	return new Response(null, { status: 204 });
};
