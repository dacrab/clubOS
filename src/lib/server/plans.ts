import { PLANS_META, type PlanData } from "$lib/config/plans";

export async function fetchPlans(): Promise<PlanData[]> {
	return PLANS_META.map((meta) => ({
		...meta,
		price: meta.currency === "eur" ? `€${meta.amount / 100}` : `$${meta.amount / 100}`,
	}));
}
