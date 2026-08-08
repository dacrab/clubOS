import { fail } from "@sveltejs/kit";
import { and, eq } from "drizzle-orm";
import { DEFAULT_SETTINGS, mergeSettings, type TenantSettings } from "$lib/config/settings";
import { getDb } from "$lib/db/client";
import { memberships } from "$lib/db/schema/memberships";
import { tenants } from "$lib/db/schema/tenants";
import { TenantSettingsSchema } from "$lib/schemas";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();
	const db = getDb();

	if (!user.tenantId) {
		return { settings: DEFAULT_SETTINGS, tenantId: null };
	}

	const rows = await db
		.select({ id: tenants.id, settings: tenants.settings })
		.from(tenants)
		.where(eq(tenants.id, user.tenantId))
		.limit(1);

	const tenant = rows[0];
	const partialSettings: Partial<TenantSettings> = tenant?.settings ?? {};

	return {
		settings: mergeSettings(partialSettings),
		tenantId: user.tenantId,
	};
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const userId = locals.userId;
		if (!userId) return fail(401, { error: "Unauthorized" });

		const db = getDb();
		const mems = await db
			.select({ role: memberships.role, tenantId: memberships.tenantId })
			.from(memberships)
			.where(and(eq(memberships.userId, userId), eq(memberships.isPrimary, true)))
			.limit(1);

		const membership = mems[0];
		if (!membership || !["owner", "admin"].includes(membership.role)) {
			return fail(403, { error: "Forbidden" });
		}

		const tenantId = membership.tenantId;

		const formData = await request.formData();
		const settingsJson = formData.get("settings");
		if (typeof settingsJson !== "string") return fail(400, { error: "Invalid settings" });

		try {
			const parsed = JSON.parse(settingsJson);
			const validated = TenantSettingsSchema.safeParse(parsed);
			if (!validated.success) return fail(400, { error: "Invalid settings structure" });

			const [existing] = await db
				.select({ settings: tenants.settings })
				.from(tenants)
				.where(eq(tenants.id, tenantId))
				.limit(1);

			const merged: Partial<TenantSettings> = {
				...(existing?.settings ?? {}),
				...validated.data,
			};
			await db.update(tenants).set({ settings: merged }).where(eq(tenants.id, tenantId));
			return { success: true };
		} catch {
			return fail(400, { error: "Invalid JSON" });
		}
	},
};
