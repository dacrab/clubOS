import type { RequestHandler } from "./$types";
import { getSupabaseAdmin } from "$lib/server/supabase-admin";
import type { MemberRole } from "$lib/types/database";

interface AdminCtx { tenantId: string; callerRole: MemberRole }

const text = (msg: string, status: number): Response => new Response(msg, { status });

/**
 * Resolve caller's primary membership and ensure they're an admin or owner.
 * Returns a Response (to short-circuit) on failure, the context on success.
 */
async function requireAdmin(locals: App.Locals): Promise<AdminCtx | Response> {
	if (!locals.user) return text("Unauthorized", 401);
	const { data: m } = await getSupabaseAdmin()
		.from("memberships")
		.select("tenant_id, role")
		.eq("user_id", locals.user.id)
		.eq("is_primary", true)
		.single();
	if (!m || (m.role !== "owner" && m.role !== "admin")) return text("Forbidden", 403);
	return { tenantId: m.tenant_id, callerRole: m.role as MemberRole };
}

/** Owners can assign any role; admins cannot assign owner. */
const canAssign = (caller: MemberRole, target: MemberRole | undefined): boolean =>
	!target || caller === "owner" || target !== "owner";

export const POST: RequestHandler = async ({ request, locals }) => {
	const ctx = await requireAdmin(locals);
	if (ctx instanceof Response) return ctx;

	const { email, full_name, password, role } = await request.json();
	if (!email || !password || !role || !full_name) return text("Missing required fields", 400);
	if (!canAssign(ctx.callerRole, role)) return text("Cannot assign higher privileges", 403);

	const admin = getSupabaseAdmin();
	const { data, error } = await admin.auth.admin.createUser({
		email, password, email_confirm: true, user_metadata: { full_name, role },
	});
	if (error) return text(error.message, 400);
	if (!data.user) return text("Failed to create user", 500);

	const { error: mErr } = await admin.from("memberships").insert({
		user_id: data.user.id, tenant_id: ctx.tenantId, role, is_primary: true,
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

	const { id, full_name, role, password } = await request.json();
	if (!id) return text("Missing id", 400);
	if (!canAssign(ctx.callerRole, role)) return text("Cannot assign higher privileges", 403);

	const admin = getSupabaseAdmin();
	const meta: Record<string, unknown> = {};
	if (full_name) meta.full_name = full_name;
	if (role) meta.role = role;

	const updates: { password?: string; user_metadata?: Record<string, unknown> } = {};
	if (password) updates.password = password;
	if (Object.keys(meta).length) updates.user_metadata = meta;

	if (Object.keys(updates).length) {
		const { error } = await admin.auth.admin.updateUserById(id, updates);
		if (error) return text(error.message, 400);
	}

	if (full_name) await admin.from("users").update({ full_name }).eq("id", id);
	if (role) await admin.from("memberships").update({ role }).eq("user_id", id).eq("tenant_id", ctx.tenantId);

	return new Response(null, { status: 204 });
};

export const PUT: RequestHandler = PATCH;

export const DELETE: RequestHandler = async ({ request, locals }) => {
	const ctx = await requireAdmin(locals);
	if (ctx instanceof Response) return ctx;

	const { id } = await request.json();
	if (!id) return text("Missing id", 400);

	const { error } = await getSupabaseAdmin().auth.admin.deleteUser(id);
	return error ? text(error.message, 400) : new Response(null, { status: 204 });
};
