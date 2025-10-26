export type Order = {
	id: string;
	created_at: string;
	subtotal?: number | null;
	discount_amount?: number | null;
	total_amount?: number | null;
	coupon_count?: number | null;
};

export type Closing = {
	session_id: string;
	orders_total?: number | null;
	treat_total?: number | null;
	total_discounts?: number | null;
};

export function ordersTotalForSession(
	closing: Closing | undefined,
	orders: readonly Order[],
): number {
	if (typeof closing?.orders_total === "number") {
		return Number(closing.orders_total);
	}
	let sum = 0;
	for (const o of orders) {
		sum += Number(o.total_amount ?? 0);
	}
	return sum;
}

export function discountsForSession(
	closing: Closing | undefined,
	orders: readonly Order[],
): number {
	if (typeof closing?.total_discounts === "number") {
		return Number(closing.total_discounts);
	}
	let sum = 0;
	for (const o of orders) {
		sum += Number(o.discount_amount ?? 0);
	}
	return sum;
}
