import { json } from "@sveltejs/kit";
import { OnboardingBodySchema } from "$lib/schemas";
import { getSupabaseAdmin } from "$lib/server/supabase-admin";
import { DAY_MS, DEFAULT_TIMEZONE, TRIAL_DAYS } from "$lib/types/database";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: "Unauthorized" }, { status: 401 });

	const parsed = OnboardingBodySchema.safeParse(await request.json().catch(() => ({})));
	if (!parsed.success) return json({ error: "Missing required fields" }, { status: 400 });

	const { tenant, facility, createTrial = true } = parsed.data;

	const { supabase } = locals;
	const admin = getSupabaseAdmin();

	try {
		const { data: existing } = await supabase
			.from("memberships")
			.select("tenant_id")
			.eq("user_id", locals.user.id)
			.limit(1)
			.single();
		if (existing) return json({ tenantId: existing.tenant_id });

		const slug = tenant.slug ?? tenant.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

		const { data: tenantData, error: tenantError } = await admin
			.from("tenants")
			.insert({ name: tenant.name, slug })
			.select()
			.single();
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
			const trialEnd = new Date(Date.now() + TRIAL_DAYS * DAY_MS).toISOString();
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
	} catch {
		return json({ error: "Failed to complete onboarding" }, { status: 500 });
	}
};
