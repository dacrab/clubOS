import { getSupabaseAdmin } from "$lib/server/supabase-admin";
import type { MemberRole } from "$lib/types/database";

export interface AdminCtx {
	tenantId: string;
	callerRole: MemberRole;
}

export async function requireAdmin(locals: App.Locals): Promise<AdminCtx | Response> {
	if (!locals.user) return text("Unauthorized", 401);
	const { data: m } = await getSupabaseAdmin()
		.from("memberships")
		.select("tenant_id, role")
		.eq("user_id", locals.user.id)
		.eq("is_primary", true)
		.single();
	if (!m || (m.role !== "owner" && m.role !== "admin")) return text("Forbidden", 403);
	const callerRole: MemberRole = m.role === "owner" ? "owner" : "admin";
	return { tenantId: m.tenant_id, callerRole };
}

export function canAssign(caller: MemberRole, target: MemberRole | undefined): boolean {
	return !target || caller === "owner" || target !== "owner";
}

export const text = (msg: string, status: number): Response => new Response(msg, { status });
