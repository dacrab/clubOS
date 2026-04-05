import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getSupabaseAdmin } from "$lib/server/supabase-admin";
import { TRIAL_DAYS, DEFAULT_TIMEZONE } from "$lib/constants";

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: "Unauthorized" }, { status: 401 });
	}

	const { tenant, facility, createTrial = true } = await request.json() as { tenant?: { name: string; slug: string }; facility?: { name: string; address?: string; phone?: string; email?: string; timezone?: string }; createTrial?: boolean };

	if (!tenant?.name || !facility?.name) {
		return json({ error: "Missing required fields" }, { status: 400 });
	}

	const { supabase } = locals;
	const admin = getSupabaseAdmin();

	try {
		const { data: existingMember } = await supabase.from("memberships").select("tenant_id").eq("user_id", locals.user.id).limit(1).single();
		if (existingMember) return json({ success: true, tenantId: existingMember.tenant_id });

		const { data: tenantData, error: tenantError } = await admin.from("tenants").insert({ name: tenant.name, slug: tenant.slug }).select().single();
		if (tenantError) throw tenantError;

		const { data: facilityData, error: facilityError } = await admin.from("facilities").insert({
			tenant_id: tenantData.id,
			name: facility.name,
			address: facility.address || null,
			phone: facility.phone || null,
			email: facility.email || null,
			timezone: facility.timezone || DEFAULT_TIMEZONE,
		}).select().single();
		if (facilityError) throw facilityError;

		const { error: membershipError } = await admin.from("memberships").insert({
			user_id: locals.user.id,
			tenant_id: tenantData.id,
			facility_id: null,
			role: "owner" as const,
			is_primary: true,
		});
		if (membershipError) throw membershipError;

		if (createTrial) {
			const trialEnd = new Date();
			trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);
			const { error: subError } = await admin.from("subscriptions").insert({
				tenant_id: tenantData.id,
				status: "trialing",
				plan_name: "Trial",
				trial_end: trialEnd.toISOString(),
				current_period_end: trialEnd.toISOString(),
			});
			if (subError) throw subError;
		}

		return json({ success: true, tenant: tenantData, facility: facilityData });
	} catch (err) {
		return json({ error: err instanceof Error ? err.message : "Failed to complete onboarding" }, { status: 500 });
	}
};
