import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";
import type { SessionUser } from "$lib/state/session.svelte";
import type { TenantSettings } from "$lib/state/settings.svelte";

export const load: LayoutServerLoad = async ({ locals }) => {
	const { user, supabase } = locals;

	if (!user) {
		throw redirect(307, "/");
	}

	// Get user profile from database
	const { data: profile } = await supabase
		.from("users")
		.select("username, role")
		.eq("id", user.id)
		.single();

	// Get tenant membership
	const { data: memberships } = await supabase
		.from("tenant_members")
		.select("tenant_id")
		.eq("user_id", user.id);

	const tenantId = memberships?.[0]?.tenant_id ?? null;

	// Get facility membership
	const { data: facilities } = await supabase
		.from("facility_members")
		.select("facility_id")
		.eq("user_id", user.id);

	const facilityId = facilities?.[0]?.facility_id ?? null;

	// Get tenant settings
	let tenantSettings: Partial<TenantSettings> | null = null;
	if (tenantId) {
		const { data: settingsData } = await supabase
			.from("tenant_settings")
			.select("*")
			.eq("tenant_id", tenantId)
			.is("facility_id", null)
			.single();
		tenantSettings = settingsData;
	}

	const sessionUser: SessionUser = {
		id: user.id,
		email: user.email ?? "",
		username: profile?.username ?? user.email ?? "",
		role: (profile?.role ?? user.user_metadata?.role ?? "staff") as SessionUser["role"],
		tenantId,
		facilityId,
	};

	return {
		user: sessionUser,
		settings: tenantSettings,
	};
};
