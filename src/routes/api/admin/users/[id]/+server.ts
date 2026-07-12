import { getSupabaseAdmin } from "$lib/server/supabase-admin";
import type { MemberRole } from "$lib/types/database";
import type { RequestHandler } from "./$types";

interface AdminCtx {
	tenantId: string;
	callerRole: MemberRole;
}

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

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const ctx = await requireAdmin(locals);
	if (ctx instanceof Response) return ctx;

	const { full_name, role, password } = await request.json();
	if (!canAssign(ctx.callerRole, role)) return text("Cannot assign higher privileges", 403);

	const admin = getSupabaseAdmin();
	const meta: Record<string, unknown> = {};
	if (full_name) meta.full_name = full_name;
	if (role) meta.role = role;

	const updates: { password?: string; user_metadata?: Record<string, unknown> } = {};
	if (password) updates.password = password;
	if (Object.keys(meta).length) updates.user_metadata = meta;

	if (Object.keys(updates).length) {
		const { error } = await admin.auth.admin.updateUserById(params.id, updates);
		if (error) return text(error.message, 400);
	}

	if (full_name) await admin.from("users").update({ full_name }).eq("id", params.id);
	if (role)
		await admin
			.from("memberships")
			.update({ role })
			.eq("user_id", params.id)
			.eq("tenant_id", ctx.tenantId);

	return new Response(null, { status: 204 });
};

export const PUT: RequestHandler = PATCH;

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const ctx = await requireAdmin(locals);
	if (ctx instanceof Response) return ctx;

	const admin = getSupabaseAdmin();
	const { data: membership } = await admin
		.from("memberships")
		.select("tenant_id")
		.eq("user_id", params.id)
		.eq("tenant_id", ctx.tenantId)
		.maybeSingle();

	if (!membership) return text("User not found in your tenant", 404);

	const { error } = await admin.auth.admin.deleteUser(params.id);
	return error ? text(error.message, 400) : new Response(null, { status: 204 });
};
