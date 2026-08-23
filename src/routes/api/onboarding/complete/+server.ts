import { json } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import type { TxOrDb } from "$lib/db/client";
import { getDb } from "$lib/db/client";
import { facilities } from "$lib/db/schema/facilities";
import { memberships } from "$lib/db/schema/memberships";
import { subscriptions } from "$lib/db/schema/subscriptions";
import { tenants } from "$lib/db/schema/tenants";
import { OnboardingBodySchema } from "$lib/schemas";
import { DAY_MS, DEFAULT_TIMEZONE, TRIAL_DAYS } from "$lib/types/database";
import type { RequestHandler } from "./$types";

const GREEK_MAP: Record<string, string> = {
	α: "a",
	β: "v",
	γ: "g",
	δ: "d",
	ε: "e",
	ζ: "z",
	η: "i",
	θ: "th",
	ι: "i",
	κ: "k",
	λ: "l",
	μ: "m",
	ν: "n",
	ξ: "x",
	ο: "o",
	π: "p",
	ρ: "r",
	σ: "s",
	ς: "s",
	τ: "t",
	υ: "y",
	φ: "f",
	χ: "ch",
	ψ: "ps",
	ω: "o",
};

function slugify(name: string): string {
	const transliterated = [...name.toLowerCase()].map((ch) => GREEK_MAP[ch] ?? ch).join("");
	return transliterated
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

async function uniqueSlug(db: TxOrDb, base: string): Promise<string> {
	let slug = base || "club";
	for (let i = 0; i < 5; i++) {
		const rows = await db
			.select({ id: tenants.id })
			.from(tenants)
			.where(eq(tenants.slug, slug))
			.limit(1);
		if (!rows[0]) return slug;
		slug = `${base || "club"}-${Math.random().toString(36).slice(2, 6)}`;
	}
	return `${base || "club"}-${Date.now().toString(36)}`;
}

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

	try {
		const tenantId = await db.transaction(async (tx) => {
			const slug = await uniqueSlug(tx, slugify(tenant.slug ?? tenant.name));

			const [tenantRow] = await tx.insert(tenants).values({ name: tenant.name, slug }).returning();

			await tx.insert(facilities).values({
				tenantId: tenantRow.id,
				name: facility.name,
				address: facility.address || null,
				phone: facility.phone || null,
				email: facility.email || null,
				timezone: facility.timezone || DEFAULT_TIMEZONE,
			});

			await tx.insert(memberships).values({
				userId,
				tenantId: tenantRow.id,
				facilityId: null,
				role: "owner",
				isPrimary: true,
			});

			if (createTrial) {
				const trialEnd = new Date(Date.now() + TRIAL_DAYS * DAY_MS);
				await tx.insert(subscriptions).values({
					tenantId: tenantRow.id,
					status: "trialing",
					planName: "Trial",
					trialEnd,
					currentPeriodEnd: trialEnd,
				});
			}

			return tenantRow.id;
		});

		return json({ tenantId });
	} catch (err) {
		const message = err instanceof Error ? err.message : "Unknown error";
		return json({ error: `Failed to complete onboarding: ${message}` }, { status: 500 });
	}
};
