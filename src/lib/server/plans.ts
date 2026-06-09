import { env } from "$env/dynamic/private";
import { stripeGet } from "./stripe";
import { PLANS_META, type PlanData } from "$lib/config/plans";

export async function fetchPlansFromStripe(): Promise<PlanData[]> {
	const key = env.STRIPE_SECRET_KEY;
	if (!key) return PLANS_META.map((m) => ({ ...m, amount: 0, currency: "eur", price: "—" }));

	const plans = await Promise.all(
		PLANS_META.map(async (meta) => {
			try {
				const price = await stripeGet<{ unit_amount: number; currency: string }>(
					`/prices/${meta.priceId}`,
					key,
				);
				return {
					...meta,
					amount: price.unit_amount,
					currency: price.currency,
					price: `€${price.unit_amount / 100}`,
				};
			} catch {
				return { ...meta, amount: 0, currency: "eur", price: "—" };
			}
		}),
	);
	return plans;
}
