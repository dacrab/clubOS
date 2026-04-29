import type { RequestHandler } from "./$types";
import { getSupabaseAdmin } from "$lib/server/supabase-admin";

type AdminCheck = { ok: boolean; error?: string; tenantId?: string; callerRole?: string };

async function requireAdmin(locals: App.Locals): Promise<AdminCheck> {
	if (!locals.user) return { ok: false, error: "Unauthorized" };
	const { data: m, error } = await getSupabaseAdmin().from("memberships").select("tenant_id, role").eq("user_id", locals.user.id).eq("is_primary", true).single();
	if (error || !m || !["owner", "admin"].includes(m.role)) return { ok: false, error: "Forbidden" };
	return { ok: true, tenantId: m.tenant_id, callerRole: m.role };
}

const getAllowedRoles = (callerRole: string): string[] =>
	callerRole === "owner" ? ["owner", "admin", "manager", "staff"] : ["admin", "manager", "staff"];

const checkAuth = (check: AdminCheck): Response | null => !check.ok ? new Response(check.error, { status: check.error === "Unauthorized" ? 401 : 403 }) : null;

const checkPrivileges = (callerRole: string | undefined, role: string | undefined): Response | null =>
	role && !getAllowedRoles(callerRole ?? "staff").includes(role) ? new Response("Cannot assign higher privileges", { status: 403 }) : null;

export const POST: RequestHandler = async ({ request, locals }) => {
	const check = await requireAdmin(locals);
	const authErr = checkAuth(check);
	if (authErr) return authErr;

	const body = await request.json();
	const { email, full_name, password, role } = body;

	if (!email || !password || !role || !full_name) {
		return new Response("Missing required fields", { status: 400 });
	}

	const privErr = checkPrivileges(check.callerRole, role);
	if (privErr) return privErr;

	const admin = getSupabaseAdmin();
	const { data: authData, error: authError } = await admin.auth.admin.createUser({
		email,
		password,
		email_confirm: true,
		user_metadata: { full_name, role },
	});

	if (authError) return new Response(authError.message, { status: 400 });
	if (!authData.user) return new Response("Failed to create user", { status: 500 });

	const { error: membershipError } = await admin.from("memberships").insert({
		user_id: authData.user.id,
		tenant_id: check.tenantId,
		role,
		is_primary: true,
	});

	if (membershipError) {
		await admin.auth.admin.deleteUser(authData.user.id);
		return new Response(membershipError.message, { status: 400 });
	}

	return Response.json({ id: authData.user.id });
};

export const PUT: RequestHandler = async ({ request, locals }) => {
	const check = await requireAdmin(locals);
	const authErr = checkAuth(check);
	if (authErr) return authErr;

	const body = await request.json();
	const { id, full_name, role, password } = body;

	if (!id) return new Response("Missing id", { status: 400 });

	const privErr = checkPrivileges(check.callerRole, role);
	if (privErr) return privErr;

	const admin = getSupabaseAdmin();
	const authUpdates: { password?: string; user_metadata?: Record<string, unknown> } = {};
	
	if (password) authUpdates.password = password;
	if (full_name || role) {
		authUpdates.user_metadata = {};
		if (full_name) authUpdates.user_metadata.full_name = full_name;
		if (role) authUpdates.user_metadata.role = role;
	}

	if (Object.keys(authUpdates).length) {
		const { error } = await admin.auth.admin.updateUserById(id, authUpdates);
		if (error) return new Response(error.message, { status: 400 });
	}

	if (full_name) await admin.from("users").update({ full_name }).eq("id", id);
	if (role) await admin.from("memberships").update({ role }).eq("user_id", id).eq("tenant_id", check.tenantId);

	return new Response(null, { status: 204 });
};

export const PATCH: RequestHandler = PUT;

export const DELETE: RequestHandler = async ({ request, locals }) => {
	const check = await requireAdmin(locals);
	const authErr = checkAuth(check);
	if (authErr) return authErr;

	const body = await request.json();
	const id = body?.id;

	if (!id) return new Response("Missing id", { status: 400 });

	const { error } = await getSupabaseAdmin().auth.admin.deleteUser(id);
	return error ? new Response(error.message, { status: 400 }) : new Response(null, { status: 204 });
};
