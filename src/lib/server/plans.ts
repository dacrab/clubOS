import { PLANS_META, type PlanData } from "$lib/config/plans";
import { CURRENCY_OPTIONS } from "$lib/config/settings";

const SYMBOLS = Object.fromEntries(CURRENCY_OPTIONS.map((c) => [c.value, c.symbol]));

export function fetchPlans(): PlanData[] {
	return PLANS_META.map((meta) => {
		const code = meta.currency?.toUpperCase();
		const symbol = code && code in SYMBOLS ? SYMBOLS[code as keyof typeof SYMBOLS] : "€";
		return { ...meta, price: `${symbol}${meta.amount / 100}` };
	});
}
