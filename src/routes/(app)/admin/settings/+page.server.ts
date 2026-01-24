import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { DEFAULT_SETTINGS, mergeSettings, type TenantSettings } from "$lib/config/settings";

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { user } = await parent();
	const { supabase } = locals;

	if (!user.tenantId) {
		return { settings: DEFAULT_SETTINGS, tenantId: null };
	}

	const { data: tenant } = await supabase
		.from("tenants")
		.select("id, settings")
		.eq("id", user.tenantId)
		.single();

	return {
		settings: mergeSettings(tenant?.settings as Partial<TenantSettings> | null),
		tenantId: user.tenantId,
	};
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const { supabase, user } = locals;

		if (!user) {
			return fail(401, { error: "Unauthorized" });
		}

		const { data: membership } = await supabase
			.from("memberships")
			.select("tenant_id")
			.eq("user_id", user.id)
			.order("is_primary", { ascending: false })
			.limit(1)
			.single();

		if (!membership?.tenant_id) {
			return fail(400, { error: "No tenant" });
		}

		const formData = await request.formData();
		const settingsJson = formData.get("settings");

		if (typeof settingsJson !== "string") {
			return fail(400, { error: "Invalid settings" });
		}

		try {
			const settings = JSON.parse(settingsJson) as Partial<TenantSettings>;

			const { error } = await supabase
				.from("tenants")
				.update({ settings })
				.eq("id", membership.tenant_id);

			if (error) {
				return fail(500, { error: error.message });
			}

			return { success: true };
		} catch {
			return fail(400, { error: "Invalid JSON" });
		}
	},
};
