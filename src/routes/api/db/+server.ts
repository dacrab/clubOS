import { json } from "@sveltejs/kit";
import { and, eq, ne, sql } from "drizzle-orm";
import { getDb } from "$lib/db/client";
import { bookings } from "$lib/db/schema/bookings";
import { categories } from "$lib/db/schema/categories";
import { orderItems } from "$lib/db/schema/order-items";
import { orders } from "$lib/db/schema/orders";
import { products } from "$lib/db/schema/products";
import { registerSessions } from "$lib/db/schema/register-sessions";
import {
	BookingConflictFilterSchema,
	BookingFormSchema,
	CategoryFormSchema,
	DbRequestSchema,
	OrderCreateFilterSchema,
	ProductFormSchema,
	RegisterSessionCloseFilterSchema,
	RegisterSessionOpenSchema,
} from "$lib/schemas";
import { resolveUserContext } from "$lib/server/auth";
import { mapRow, mapRows } from "$lib/utils/mapper";
import type { RequestHandler } from "./$types";

function forbidden(msg = "Forbidden") {
	return json({ error: msg }, { status: 403 });
}

function idFrom(filter: Record<string, unknown> | undefined): string {
	return typeof filter?.id === "string" ? filter.id : "";
}

export const POST: RequestHandler = async ({ request, locals }) => {
	const userId = locals.userId;
	if (!userId) return json({ error: "Unauthorized" }, { status: 401 });

	const ctx = await resolveUserContext(userId);
	if (!ctx.membership) return forbidden("No membership");
	const { facilityId } = ctx.membership;

	const body = await request.json().catch(() => null);
	const parsed = DbRequestSchema.safeParse(body);
	if (!parsed.success) return json({ error: "Invalid request" }, { status: 400 });
	const { action, data, filter } = parsed.data;

	const db = getDb();

	switch (action) {
		// ── Products ──
		case "products.insert": {
			if (!facilityId) return forbidden();
			const parsed = ProductFormSchema.safeParse(data);
			if (!parsed.success) return json({ error: "Invalid request" }, { status: 400 });
			const [row] = await db
				.insert(products)
				.values({ ...parsed.data, facilityId, createdBy: userId })
				.returning();
			return json(row ? mapRow(row) : null);
		}
		case "products.update": {
			if (!facilityId) return forbidden();
			const parsed = ProductFormSchema.safeParse(data);
			if (!parsed.success) return json({ error: "Invalid request" }, { status: 400 });
			const [row] = await db
				.update(products)
				.set(parsed.data)
				.where(and(eq(products.id, idFrom(filter)), eq(products.facilityId, facilityId)))
				.returning();
			if (!row) return forbidden();
			return json(mapRow(row));
		}
		case "products.delete": {
			if (!facilityId) return forbidden();
			const [row] = await db
				.delete(products)
				.where(and(eq(products.id, idFrom(filter)), eq(products.facilityId, facilityId)))
				.returning();
			if (!row) return forbidden();
			return json({ success: true });
		}
		case "products.search": {
			if (!facilityId) return forbidden();
			const text = String(data?.searchText ?? "");
			const rows = await db
				.select()
				.from(products)
				.where(
					and(
						eq(products.facilityId, facilityId),
						text ? sql`${products.name} ILIKE ${`%${text}%`}` : undefined,
					),
				)
				.orderBy(products.name)
				.limit(20);
			return json(mapRows(rows));
		}

		// ── Categories ──
		case "categories.insert": {
			if (!facilityId) return forbidden();
			const parsed = CategoryFormSchema.safeParse(data);
			if (!parsed.success) return json({ error: "Invalid request" }, { status: 400 });
			const [row] = await db
				.insert(categories)
				.values({ ...parsed.data, facilityId })
				.returning();
			return json(row ? mapRow(row) : null);
		}
		case "categories.update": {
			if (!facilityId) return forbidden();
			const parsed = CategoryFormSchema.safeParse(data);
			if (!parsed.success) return json({ error: "Invalid request" }, { status: 400 });
			const [row] = await db
				.update(categories)
				.set(parsed.data)
				.where(and(eq(categories.id, idFrom(filter)), eq(categories.facilityId, facilityId)))
				.returning();
			if (!row) return forbidden();
			return json(mapRow(row));
		}
		case "categories.delete": {
			if (!facilityId) return forbidden();
			const [row] = await db
				.delete(categories)
				.where(and(eq(categories.id, idFrom(filter)), eq(categories.facilityId, facilityId)))
				.returning();
			if (!row) return forbidden();
			return json({ success: true });
		}

		// ── Bookings ──
		case "bookings.insert": {
			if (!facilityId) return forbidden();
			const parsed = BookingFormSchema.safeParse(data);
			if (!parsed.success) return json({ error: "Invalid request" }, { status: 400 });
			const [row] = await db
				.insert(bookings)
				.values({ ...parsed.data, facilityId, createdBy: userId })
				.returning();
			return json(row ? mapRow(row) : null);
		}
		case "bookings.update": {
			if (!facilityId) return forbidden();
			const parsed = BookingFormSchema.safeParse(data);
			if (!parsed.success) return json({ error: "Invalid request" }, { status: 400 });
			const [row] = await db
				.update(bookings)
				.set({ ...parsed.data, updatedAt: sql`now()` })
				.where(and(eq(bookings.id, idFrom(filter)), eq(bookings.facilityId, facilityId)))
				.returning();
			if (!row) return forbidden();
			return json(mapRow(row));
		}
		case "bookings.delete": {
			if (!facilityId) return forbidden();
			const [row] = await db
				.delete(bookings)
				.where(and(eq(bookings.id, idFrom(filter)), eq(bookings.facilityId, facilityId)))
				.returning();
			if (!row) return forbidden();
			return json({ success: true });
		}
		case "bookings.checkConflict": {
			if (!facilityId) return forbidden();
			const conflictFilter = BookingConflictFilterSchema.safeParse(filter);
			if (!conflictFilter.success) return json({ error: "Invalid request" }, { status: 400 });
			const bookingType = conflictFilter.data.type ?? "event";
			const conf = await db
				.select({ count: sql<number>`count(*)::int` })
				.from(bookings)
				.where(
					and(
						eq(bookings.facilityId, facilityId),
						eq(bookings.type, bookingType),
						sql`${bookings.startsAt} < ${conflictFilter.data.endsAt}::timestamptz`,
						sql`${bookings.endsAt} > ${conflictFilter.data.startsAt}::timestamptz`,
						conflictFilter.data.excludeId
							? ne(bookings.id, conflictFilter.data.excludeId)
							: undefined,
					),
				);
			return json({ conflict: Number(conf[0]?.count ?? 0) > 0 });
		}

		// ── Register Sessions ──
		case "registerSessions.insert": {
			if (!facilityId) return forbidden();
			const parsed = RegisterSessionOpenSchema.safeParse(data);
			if (!parsed.success) return json({ error: "Invalid request" }, { status: 400 });
			const [row] = await db
				.insert(registerSessions)
				.values({ ...parsed.data, facilityId, openedBy: userId })
				.returning();
			return json(row ? mapRow(row) : null);
		}
		case "registerSessions.close": {
			if (!facilityId) return forbidden();
			const closeFilter = RegisterSessionCloseFilterSchema.safeParse(filter);
			if (!closeFilter.success) return json({ error: "Invalid request" }, { status: 400 });
			const [row] = await db
				.update(registerSessions)
				.set({
					closedBy: userId,
					closedAt: sql`now()`,
					closingCash: closeFilter.data.closingCash ?? null,
					notes: closeFilter.data.notes ?? null,
				})
				.where(
					and(
						eq(registerSessions.id, closeFilter.data.sessionId),
						eq(registerSessions.facilityId, facilityId),
					),
				)
				.returning();
			if (!row) return forbidden();
			return json({ success: true });
		}

		// ── Orders ──
		case "orders.create": {
			if (!facilityId) return forbidden();
			const orderFilter = OrderCreateFilterSchema.safeParse(filter);
			if (!orderFilter.success) return json({ error: "No items" }, { status: 400 });

			const { items, couponCount = 0, couponValue = 0.5 } = orderFilter.data;

			const rows = items.map((i) => ({
				productId: i.productId,
				productName: i.productName,
				quantity: i.quantity,
				unitPrice: i.unitPrice,
				lineTotal: i.lineTotal,
				isTreat: i.isTreat ?? false,
			}));

			const subtotal = rows.reduce((s, i) => s + i.lineTotal, 0);
			const discountAmount = couponCount * couponValue;
			const totalAmount = Math.max(0, subtotal - discountAmount);

			const [order] = await db
				.insert(orders)
				.values({
					facilityId,
					sessionId: orderFilter.data.sessionId,
					subtotal,
					discountAmount,
					totalAmount,
					couponCount,
					createdBy: userId,
				})
				.returning();

			await db.insert(orderItems).values(
				rows.map((i) => ({
					orderId: order.id,
					facilityId,
					productId: i.productId,
					productName: i.productName,
					quantity: i.quantity,
					unitPrice: i.unitPrice,
					lineTotal: i.lineTotal,
					isTreat: i.isTreat,
				})),
			);

			return json(order ? mapRow(order) : null);
		}

		default:
			return json({ error: `Unknown action: ${action}` }, { status: 400 });
	}
};
