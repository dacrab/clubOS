import { json } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import { getDb } from "$lib/db/client";
import { facilities } from "$lib/db/schema/facilities";
import { memberships } from "$lib/db/schema/memberships";
import { subscriptions } from "$lib/db/schema/subscriptions";
import { tenants } from "$lib/db/schema/tenants";
import { OnboardingBodySchema } from "$lib/schemas";
import { DAY_MS, DEFAULT_TIMEZONE, TRIAL_DAYS } from "$lib/types/database";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, locals }) => {
	const userId = locals.userId;
	if (!userId) return json({ error: "Unauthorized" }, { status: 401 });

	const parsed = OnboardingBodySchema.safeParse(await request.json().catch(() => ({})));
	if (!parsed.success) return json({ error: "Missing required fields" }, { status: 400 });

	const { tenant, facility, createTrial = true } = parsed.data;
	const db = getDb();

	const existingMems = await db
		.select({ tenantId: memberships.tenantId })
		.from(memberships)
		.where(eq(memberships.userId, userId))
		.limit(1);

	if (existingMems[0]) return json({ tenantId: existingMems[0].tenantId });

	const slug = tenant.slug ?? tenant.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

	try {
		const [tenantRow] = await db.insert(tenants).values({ name: tenant.name, slug }).returning();

		await db.insert(facilities).values({
			tenantId: tenantRow.id,
			name: facility.name,
			address: facility.address || null,
			phone: facility.phone || null,
			email: facility.email || null,
			timezone: facility.timezone || DEFAULT_TIMEZONE,
		});

		await db.insert(memberships).values({
			userId,
			tenantId: tenantRow.id,
			facilityId: null,
			role: "owner",
			isPrimary: true,
		});

		if (createTrial) {
			const trialEnd = new Date(Date.now() + TRIAL_DAYS * DAY_MS);
			await db.insert(subscriptions).values({
				tenantId: tenantRow.id,
				status: "trialing",
				planName: "Trial",
				trialEnd,
				currentPeriodEnd: trialEnd,
			});
		}

		return json({ tenantId: tenantRow.id });
	} catch (err) {
		const message = err instanceof Error ? err.message : "Unknown error";
		return json({ error: `Failed to complete onboarding: ${message}` }, { status: 500 });
	}
};
