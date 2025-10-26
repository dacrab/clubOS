export type OrderLine = {
	price: number;
	is_treat?: boolean | null;
};

export function subtotal(items: readonly OrderLine[]): number {
	let sum = 0;
	for (const item of items) {
		const isTreat = Boolean(item.is_treat);
		sum += isTreat ? 0 : Number(item.price ?? 0);
	}
	return sum;
}

export function discountAmount(couponCount: number): number {
	const count = Math.max(0, Number(couponCount ?? 0));
	return count * 2;
}

export function totalAmount(
	items: readonly OrderLine[],
	couponCount: number,
): number {
	const sub = subtotal(items);
	const disc = discountAmount(couponCount);
	const total = sub - disc;
	return total > 0 ? total : 0;
}
