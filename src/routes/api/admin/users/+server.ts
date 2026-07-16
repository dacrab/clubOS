import { AdminUserCreateSchema, AdminUserDeleteSchema, AdminUserUpdateSchema } from "$lib/schemas";
import { canAssign, requireAdmin, text } from "$lib/server/admin-helpers";
import { getSupabaseAdmin } from "$lib/server/supabase-admin";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, locals }) => {
	const ctx = await requireAdmin(locals);
	if (ctx instanceof Response) return ctx;

	const parsed = AdminUserCreateSchema.safeParse(await request.json().catch(() => ({})));
	if (!parsed.success) return text("Missing required fields", 400);

	const { email, full_name, password, role } = parsed.data;
	if (!canAssign(ctx.callerRole, role)) return text("Cannot assign higher privileges", 403);

	const admin = getSupabaseAdmin();
	const { data, error } = await admin.auth.admin.createUser({
		email,
		password,
		email_confirm: true,
		user_metadata: { full_name, role },
	});
	if (error) return text("Failed to create user", 400);
	if (!data.user) return text("Failed to create user", 500);

	const { error: mErr } = await admin.from("memberships").insert({
		user_id: data.user.id,
		tenant_id: ctx.tenantId,
		role,
		is_primary: true,
	});
	if (mErr) {
		await admin.auth.admin.deleteUser(data.user.id);
		return text(mErr.message, 400);
	}
	return Response.json({ id: data.user.id });
};

export const PATCH: RequestHandler = async ({ request, locals }) => {
	const ctx = await requireAdmin(locals);
	if (ctx instanceof Response) return ctx;

	const parsed = AdminUserUpdateSchema.safeParse(await request.json().catch(() => ({})));
	if (!parsed.success) return text("Missing required fields", 400);

	const { id, full_name, role, password } = parsed.data;
	if (!id) return text("Missing id", 400);
	if (role && !canAssign(ctx.callerRole, role)) return text("Cannot assign higher privileges", 403);

	const admin = getSupabaseAdmin();
	const meta: Record<string, unknown> = {};
	if (full_name) meta.full_name = full_name;
	if (role) meta.role = role;

	const updates: { password?: string; user_metadata?: Record<string, unknown> } = {};
	if (password) updates.password = password;
	if (Object.keys(meta).length) updates.user_metadata = meta;

	if (Object.keys(updates).length) {
		const { error } = await admin.auth.admin.updateUserById(id, updates);
		if (error) return text("Failed to update user", 400);
	}

	if (full_name) await admin.from("users").update({ full_name }).eq("id", id);
	if (role)
		await admin
			.from("memberships")
			.update({ role })
			.eq("user_id", id)
			.eq("tenant_id", ctx.tenantId);

	return new Response(null, { status: 204 });
};

export const PUT: RequestHandler = PATCH;

export const DELETE: RequestHandler = async ({ request, locals }) => {
	const ctx = await requireAdmin(locals);
	if (ctx instanceof Response) return ctx;

	const parsed = AdminUserDeleteSchema.safeParse(await request.json().catch(() => ({})));
	if (!parsed.success) return text("Missing id", 400);

	const { id } = parsed.data;

	const admin = getSupabaseAdmin();
	const { data: membership } = await admin
		.from("memberships")
		.select("tenant_id")
		.eq("user_id", id)
		.eq("tenant_id", ctx.tenantId)
		.maybeSingle();

	if (!membership) return text("User not found in your tenant", 404);

	const { error } = await admin.auth.admin.deleteUser(id);
	return error ? text("Failed to delete user", 400) : new Response(null, { status: 204 });
};
