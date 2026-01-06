/**
 * Admin Users API - Server-side implementation
 * Replaces edge functions with direct supabase-admin calls
 */

import type { RequestHandler } from "@sveltejs/kit";
import { getSupabaseAdmin } from "$lib/server/supabase-admin";

// Check if user is admin/owner
async function requireAdmin(locals: App.Locals): Promise<{ ok: boolean; error?: string; tenantId?: string }> {
	if (!locals.user) return { ok: false, error: "Unauthorized" };

	const admin = getSupabaseAdmin();
	const { data: membership } = await admin
		.from("memberships")
		.select("tenant_id, role")
		.eq("user_id", locals.user.id)
		.eq("is_primary", true)
		.single();

	if (!membership || !["owner", "admin"].includes(membership.role)) {
		return { ok: false, error: "Forbidden" };
	}

	return { ok: true, tenantId: membership.tenant_id };
}

export const POST: RequestHandler = async ({ request, locals }) => {
	const check = await requireAdmin(locals);
	if (!check.ok) return new Response(check.error, { status: check.error === "Unauthorized" ? 401 : 403 });

	const body = await request.json();
	const { email, full_name, password, role } = body;

	if (!email || !password || !role || !full_name) {
		return new Response("Missing required fields", { status: 400 });
	}

	const admin = getSupabaseAdmin();

	// Create auth user
	const { data: authData, error: authError } = await admin.auth.admin.createUser({
		email,
		password,
		email_confirm: true,
		user_metadata: { full_name, role },
	});

	if (authError) return new Response(authError.message, { status: 400 });
	if (!authData.user) return new Response("Failed to create user", { status: 500 });

	// Create membership in same tenant
	const { error: membershipError } = await admin.from("memberships").insert({
		user_id: authData.user.id,
		tenant_id: check.tenantId,
		role,
		is_primary: true,
	});

	if (membershipError) {
		// Rollback: delete auth user
		await admin.auth.admin.deleteUser(authData.user.id);
		return new Response(membershipError.message, { status: 400 });
	}

	return Response.json({ id: authData.user.id });
};

export const PUT: RequestHandler = async ({ request, locals }) => {
	const check = await requireAdmin(locals);
	if (!check.ok) return new Response(check.error, { status: check.error === "Unauthorized" ? 401 : 403 });

	const body = await request.json();
	const { id, full_name, role, password } = body;

	if (!id) return new Response("Missing id", { status: 400 });

	const admin = getSupabaseAdmin();

	// Update auth user metadata
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

	// Update users table
	if (full_name) {
		await admin.from("users").update({ full_name }).eq("id", id);
	}

	// Update membership role
	if (role) {
		await admin.from("memberships").update({ role }).eq("user_id", id).eq("tenant_id", check.tenantId);
	}

	return new Response(null, { status: 204 });
};

export const PATCH: RequestHandler = PUT;

export const DELETE: RequestHandler = async ({ request, locals }) => {
	const check = await requireAdmin(locals);
	if (!check.ok) return new Response(check.error, { status: check.error === "Unauthorized" ? 401 : 403 });

	const body = await request.json();
	const id = body?.id;

	if (!id) return new Response("Missing id", { status: 400 });

	const admin = getSupabaseAdmin();

	// Delete auth user (cascades to users table and memberships via FK)
	const { error } = await admin.auth.admin.deleteUser(id);
	if (error) return new Response(error.message, { status: 400 });

	return new Response(null, { status: 204 });
};
