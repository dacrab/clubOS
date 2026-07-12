import { PLANS_META, type PlanData } from "$lib/config/plans";
import { CURRENCY_OPTIONS } from "$lib/config/settings";

const SYMBOLS = Object.fromEntries(CURRENCY_OPTIONS.map((c) => [c.value, c.symbol]));

export async function fetchPlans(): Promise<PlanData[]> {
	return PLANS_META.map((meta) => ({
		...meta,
		price: `${SYMBOLS[meta.currency.toUpperCase()] ?? "€"}${meta.amount / 100}`,
	}));
}
