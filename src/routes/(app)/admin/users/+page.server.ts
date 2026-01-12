import type { PageServerLoad } from "./$types";
import { getSupabaseAdmin } from "$lib/server/supabase-admin";

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();
	const admin = getSupabaseAdmin();

	// Get memberships for this tenant
	const { data: memberships } = await admin
		.from("memberships")
		.select("user_id, role")
		.eq("tenant_id", user.tenantId);

	if (!memberships?.length) return { users: [] };

	// Get user details
	const userIds = memberships.map(m => m.user_id);
	const { data: userDetails } = await admin.from("users").select("id, full_name").in("id", userIds);
	const userMap = new Map(userDetails?.map(u => [u.id, u.full_name]) ?? []);

	// Get auth users for emails
	const { data: authData } = await admin.auth.admin.listUsers();
	const emailMap = new Map(authData.users.map(u => [u.id, u.email]));

	const users = memberships.map(m => ({
		id: m.user_id,
		email: emailMap.get(m.user_id) ?? "",
		full_name: userMap.get(m.user_id) ?? null,
		role: m.role,
	}));

	return { users };
};
