import { supabase } from "$lib/utils/supabase";
import { facilityState } from "./facility.svelte";
import { registerState } from "./register.svelte";

export type SaleItem = { id: string; price: number; is_treat?: boolean };

export type CreateSalePayload = {
	items: Array<SaleItem & { name?: string }>; // name is only for UI; not persisted here
	paymentMethod: "cash"; // reserved for future payment expansion
	couponCount: number;
};

class SalesState {
	async create(userId: string, payload: CreateSalePayload): Promise<void> {
		const sessionId = await registerState.ensureOpenSession(userId);

		const subtotal = payload.items.reduce((acc, item) => acc + Number(item.price), 0);
		const treatDiscount = payload.items.reduce(
			(acc, item) => acc + (item.is_treat ? Number(item.price) : 0),
			0,
		);
		const couponDiscount = Math.max(0, payload.couponCount) * 2;
		const discount_amount = couponDiscount + treatDiscount;
		const total_amount = Math.max(0, subtotal - discount_amount);

		const { data: memberships } = await supabase
			.from("tenant_members")
			.select("tenant_id")
			.eq("user_id", userId);
		const tenantId = memberships?.[0]?.tenant_id as string | undefined;

		let facilityId = facilityState.selectedId;
		if (!facilityId) {
			facilityId = await facilityState.resolveSelected();
		}

		const { data: inserted, error } = await supabase
			.from("orders")
			.insert({
				session_id: sessionId,
				subtotal,
				discount_amount,
				total_amount,
				coupon_count: Math.max(0, payload.couponCount),
				created_by: userId,
				tenant_id: tenantId,
				facility_id: facilityId,
			})
			.select()
			.single();
		if (error || !inserted) {
			throw new Error(error?.message || "Failed to create order");
		}

		const items = payload.items.map((product) => ({
			order_id: inserted.id as string,
			product_id: product.id,
			quantity: 1,
			unit_price: Number(product.price),
			line_total: product.is_treat ? 0 : Number(product.price),
			is_treat: Boolean(product.is_treat),
		}));
		const { error: itemsError } = await supabase.from("order_items").insert(items);
		if (itemsError) {
			throw new Error(itemsError.message);
		}
	}
}

export const salesState = new SalesState();
