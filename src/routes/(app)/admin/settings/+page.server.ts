import { fail } from "@sveltejs/kit";
import { DEFAULT_SETTINGS, mergeSettings, type TenantSettings } from "$lib/config/settings";
import { TenantSettingsSchema } from "$lib/schemas";
import type { Actions, PageServerLoad } from "./$types";

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

	const rawSettings: unknown = tenant?.settings;
	const partialSettings: Partial<TenantSettings> =
		rawSettings && typeof rawSettings === "object"
			? (Object.assign({}, rawSettings as Record<string, unknown>) as Partial<TenantSettings>)
			: {};

	return {
		settings: mergeSettings(partialSettings),
		tenantId: user.tenantId,
	};
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const { supabase, user } = locals;
		if (!user) return fail(401, { error: "Unauthorized" });

		const { data: membership } = await supabase
			.from("memberships")
			.select("role, tenant_id")
			.eq("user_id", user.id)
			.eq("is_primary", true)
			.single();

		if (!membership || !["owner", "admin"].includes(membership.role)) {
			return fail(403, { error: "Forbidden" });
		}

		const tenantId = membership.tenant_id;

		const formData = await request.formData();
		const settingsJson = formData.get("settings");
		if (typeof settingsJson !== "string") return fail(400, { error: "Invalid settings" });

		try {
			const parsed = JSON.parse(settingsJson);
			const validated = TenantSettingsSchema.safeParse(parsed);
			if (!validated.success) return fail(400, { error: "Invalid settings structure" });
			const { error } = await supabase
				.from("tenants")
				.update({ settings: validated.data })
				.eq("id", tenantId);
			if (error) return fail(500, { error: error.message });
			return { success: true };
		} catch {
			return fail(400, { error: "Invalid JSON" });
		}
	},
};
