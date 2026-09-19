import { PLANS_META, type PlanData } from "$lib/config/plans";
import { currencySymbol } from "$lib/config/settings";

export function fetchPlans(): PlanData[] {
	return PLANS_META.map((meta) => {
		const symbol = currencySymbol(meta.currency?.toUpperCase());
		return { ...meta, price: `${symbol}${meta.amount / 100}` };
	});
}
