import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getSupabaseAdmin } from "$lib/server/supabase-admin";

const TRIAL_DAYS = 14;

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: "Unauthorized" }, { status: 401 });
	}

	const { tenant, facility, createTrial = true } = await request.json();

	if (!tenant?.name || !facility?.name) {
		return json({ error: "Missing required fields" }, { status: 400 });
	}

	const supabase = locals.supabase;
	const supabaseAdmin = getSupabaseAdmin();

	try {
		// Check if user already has a tenant (via memberships)
		const { data: existingMember } = await supabase
			.from("memberships")
			.select("tenant_id")
			.eq("user_id", locals.user.id)
			.limit(1)
			.single();

		if (existingMember) {
			return json({ success: true, tenantId: existingMember.tenant_id });
		}

		// Create tenant
		const { data: tenantData, error: tenantError } = await supabaseAdmin
			.from("tenants")
			.insert({
				name: tenant.name,
				slug: tenant.slug,
			})
			.select()
			.single();

		if (tenantError) throw tenantError;

		// Create facility
		const { data: facilityData, error: facilityError } = await supabaseAdmin
			.from("facilities")
			.insert({
				tenant_id: tenantData.id,
				name: facility.name,
				address: facility.address || null,
				phone: facility.phone || null,
				email: facility.email || null,
				timezone: facility.timezone || "Europe/Athens",
			})
			.select()
			.single();

		if (facilityError) throw facilityError;

		// Create membership (unified: user is owner with tenant-wide access)
		const { error: membershipError } = await supabaseAdmin.from("memberships").insert({
			user_id: locals.user.id,
			tenant_id: tenantData.id,
			facility_id: null, // null = tenant-wide access
			role: "owner",
			is_primary: true,
		});

		if (membershipError) throw membershipError;

		// Create trial subscription if requested
		if (createTrial) {
			const trialEnd = new Date();
			trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);

			const { error: subscriptionError } = await supabaseAdmin.from("subscriptions").insert({
				tenant_id: tenantData.id,
				status: "trialing",
				plan_name: "Trial",
				trial_end: trialEnd.toISOString(),
				current_period_end: trialEnd.toISOString(),
			});

			if (subscriptionError) throw subscriptionError;
		}

		return json({
			success: true,
			tenant: tenantData,
			facility: facilityData,
		});
	} catch (err) {
		return json(
			{ error: err instanceof Error ? err.message : "Failed to complete onboarding" },
			{ status: 500 }
		);
	}
};
