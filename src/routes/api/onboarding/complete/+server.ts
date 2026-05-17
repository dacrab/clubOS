import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getSupabaseAdmin } from "$lib/server/supabase-admin";
import { TRIAL_DAYS, DEFAULT_TIMEZONE } from "$lib/types/database";

interface Body {
	tenant?: { name: string; slug: string };
	facility?: { name: string; address?: string; phone?: string; email?: string; timezone?: string };
	createTrial?: boolean;
}

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: "Unauthorized" }, { status: 401 });

	const { tenant, facility, createTrial = true } = (await request.json()) as Body;
	if (!tenant?.name || !facility?.name) return json({ error: "Missing required fields" }, { status: 400 });

	const { supabase } = locals;
	const admin = getSupabaseAdmin();

	try {
		// Idempotent: if user already belongs to a tenant, return it.
		const { data: existing } = await supabase
			.from("memberships")
			.select("tenant_id")
			.eq("user_id", locals.user.id)
			.limit(1)
			.single();
		if (existing) return json({ tenantId: existing.tenant_id });

		const { data: tenantData, error: tenantError } = await admin
			.from("tenants").insert({ name: tenant.name, slug: tenant.slug })
			.select().single();
		if (tenantError) throw tenantError;

		const { error: facilityError } = await admin.from("facilities").insert({
			tenant_id: tenantData.id,
			name: facility.name,
			address: facility.address || null,
			phone: facility.phone || null,
			email: facility.email || null,
			timezone: facility.timezone || DEFAULT_TIMEZONE,
		});
		if (facilityError) throw facilityError;

		const { error: membershipError } = await admin.from("memberships").insert({
			user_id: locals.user.id,
			tenant_id: tenantData.id,
			facility_id: null,
			role: "owner",
			is_primary: true,
		});
		if (membershipError) throw membershipError;

		if (createTrial) {
			const trialEnd = new Date(Date.now() + TRIAL_DAYS * 86_400_000).toISOString();
			const { error: subError } = await admin.from("subscriptions").insert({
				tenant_id: tenantData.id,
				status: "trialing",
				plan_name: "Trial",
				trial_end: trialEnd,
				current_period_end: trialEnd,
			});
			if (subError) throw subError;
		}

		return json({ tenantId: tenantData.id });
	} catch (err) {
		return json({ error: err instanceof Error ? err.message : "Failed to complete onboarding" }, { status: 500 });
	}
};
