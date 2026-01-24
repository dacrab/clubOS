import type { PageServerLoad } from "./$types";
import { getSupabaseAdmin } from "$lib/server/supabase-admin";

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();
	const admin = getSupabaseAdmin();

	// Get users from view (joins memberships + users)
	const { data: tenantUsers } = await admin
		.from("v_tenant_users")
		.select("user_id, role, full_name")
		.eq("tenant_id", user.tenantId);

	if (!tenantUsers?.length) return { users: [] };

	// Get auth users for emails (still need admin API for this)
	const { data: authData } = await admin.auth.admin.listUsers();
	const emailMap = new Map(authData.users.map(u => [u.id, u.email]));

	const users = tenantUsers.map(u => ({
		id: u.user_id,
		email: emailMap.get(u.user_id) ?? "",
		full_name: u.full_name,
		role: u.role,
	}));

	return { users };
};
