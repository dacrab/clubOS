import { json } from "@sveltejs/kit";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { mergeSettings } from "$lib/config/settings";
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
import type { DbAction, MemberRole } from "$lib/types/database";
import { escapeLike } from "$lib/utils/helpers";
import type { RequestHandler } from "./$types";

function forbidden(msg = "Forbidden") {
	return json({ error: msg }, { status: 403 });
}

function idFrom(filter: Record<string, unknown> | undefined): string {
	return typeof filter?.id === "string" ? filter.id : "";
}

const ACTION_ROLES: Record<DbAction, readonly MemberRole[]> = {
	"products.insert": ["owner", "admin"],
	"products.update": ["owner", "admin"],
	"products.delete": ["owner", "admin"],
	"products.search": ["owner", "admin", "manager", "staff"],
	"categories.insert": ["owner", "admin"],
	"categories.update": ["owner", "admin"],
	"categories.delete": ["owner", "admin"],
	"bookings.insert": ["owner", "admin", "manager"],
	"bookings.update": ["owner", "admin", "manager"],
	"bookings.delete": ["owner", "admin", "manager"],
	"bookings.checkConflict": ["owner", "admin", "manager"],
	"registerSessions.insert": ["owner", "admin", "manager", "staff"],
	"registerSessions.close": ["owner", "admin", "manager", "staff"],
	"orders.create": ["owner", "admin", "manager", "staff"],
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const userId = locals.userId;
	if (!userId) return json({ error: "Unauthorized" }, { status: 401 });

	const ctx = await resolveUserContext(userId);
	if (!ctx.membership) return forbidden("No membership");
	const { facilityId, role } = ctx.membership;

	const body = await request.json().catch(() => null);
	const parsed = DbRequestSchema.safeParse(body);
	if (!parsed.success) return json({ error: "Invalid request" }, { status: 400 });
	const { action, data, filter } = parsed.data;

	if (!ACTION_ROLES[action].includes(role)) return forbidden("Insufficient role");

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
			return json(row ?? null);
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
			return json(row);
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
						text ? sql`${products.name} ILIKE ${`%${escapeLike(text)}%`}` : undefined,
					),
				)
				.orderBy(products.name)
				.limit(20);
			return json(rows);
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
			return json(row ?? null);
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
			return json(row);
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
			// The DB enforces exclusivity via bookings_no_overlap (drizzle/0004);
			// this re-check just returns a friendlier 409 before hitting it.
			const preventOverlaps = mergeSettings(ctx.tenant?.settings ?? null).prevent_overlaps;
			const created = await db.transaction(async (tx) => {
				if (preventOverlaps) {
					const conf = await tx
						.select({ count: sql<number>`count(*)::int` })
						.from(bookings)
						.where(
							and(
								eq(bookings.facilityId, facilityId),
								eq(bookings.type, parsed.data.type),
								sql`${bookings.startsAt} < ${parsed.data.endsAt}`,
								sql`${bookings.endsAt} > ${parsed.data.startsAt}`,
							),
						);
					if (Number(conf[0]?.count ?? 0) > 0) return null;
				}
				const [row] = await tx
					.insert(bookings)
					.values({ ...parsed.data, facilityId, createdBy: userId })
					.returning();
				return row;
			});
			if (!created)
				return json({ error: "Slot conflicts with an existing booking" }, { status: 409 });
			return json(created);
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
			return json(row);
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
			// UI pre-check only; the hard guarantee is the bookings_no_overlap
			// exclusion constraint (drizzle/0004), with the tx re-check in
			// `bookings.insert` as defense-in-depth.
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
			return json(row ?? null);
		}
		case "registerSessions.close": {
			if (!facilityId) return forbidden();
			const closeFilter = RegisterSessionCloseFilterSchema.safeParse(filter);
			if (!closeFilter.success) return json({ error: "Invalid request" }, { status: 400 });
			const closed = await db.transaction(async (tx) => {
				const totals = await tx
					.select({ total: sql<string>`COALESCE(SUM(${orders.totalAmount}), '0')` })
					.from(orders)
					.where(
						and(
							eq(orders.sessionId, closeFilter.data.sessionId),
							eq(orders.facilityId, facilityId),
						),
					);
				const expectedCash = Number(totals[0]?.total ?? 0);
				const [row] = await tx
					.update(registerSessions)
					.set({
						closedBy: userId,
						closedAt: sql`now()`,
						closingCash: closeFilter.data.closingCash ?? null,
						expectedCash,
						notes: closeFilter.data.notes ?? null,
					})
					.where(
						and(
							eq(registerSessions.id, closeFilter.data.sessionId),
							eq(registerSessions.facilityId, facilityId),
						),
					)
					.returning();
				return row;
			});
			if (!closed) return forbidden();
			return json({ success: true });
		}

		// ── Orders ──
		case "orders.create": {
			if (!facilityId) return forbidden();
			const orderFilter = OrderCreateFilterSchema.safeParse(filter);
			if (!orderFilter.success) return json({ error: "No items" }, { status: 400 });

			const { items, couponCount = 0 } = orderFilter.data;

			// Look up prices server-side — never trust client-supplied prices.
			const productIds = [...new Set(items.map((i) => i.productId))];
			const productRows = await db
				.select({
					id: products.id,
					name: products.name,
					price: products.price,
					trackInventory: products.trackInventory,
				})
				.from(products)
				.where(and(eq(products.facilityId, facilityId), inArray(products.id, productIds)));

			const productById = new Map(productRows.map((p) => [p.id, p]));

			const lineItems: Array<{
				productId: string;
				productName: string;
				quantity: number;
				unitPrice: number;
				lineTotal: number;
				isTreat: boolean;
			}> = [];
			for (const item of items) {
				const product = productById.get(item.productId);
				if (!product)
					return json(
						{ error: "One or more items are not available in this facility" },
						{ status: 400 },
					);
				const isTreat = item.isTreat ?? false;
				lineItems.push({
					productId: product.id,
					productName: product.name,
					quantity: item.quantity,
					unitPrice: product.price,
					lineTotal: isTreat ? 0 : product.price * item.quantity,
					isTreat,
				});
			}

			const session = await db
				.select({ id: registerSessions.id })
				.from(registerSessions)
				.where(
					and(
						eq(registerSessions.id, orderFilter.data.sessionId),
						eq(registerSessions.facilityId, facilityId),
					),
				)
				.limit(1);
			if (!session[0]) return json({ error: "Invalid register session" }, { status: 400 });

			const subtotal = lineItems.reduce((s, i) => s + i.lineTotal, 0);
			const couponValue = mergeSettings(ctx.tenant?.settings ?? null).coupons_value;
			const discountAmount = couponCount * couponValue;
			const totalAmount = Math.max(0, subtotal - discountAmount);

			const order = await db.transaction(async (tx) => {
				const [created] = await tx
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

				await tx.insert(orderItems).values(
					lineItems.map((i) => ({
						orderId: created.id,
						facilityId,
						productId: i.productId,
						productName: i.productName,
						quantity: i.quantity,
						unitPrice: i.unitPrice,
						lineTotal: i.lineTotal,
						isTreat: i.isTreat,
					})),
				);

				// Decrement stock for products that track inventory.
				for (const item of lineItems) {
					const product = productById.get(item.productId);
					if (product?.trackInventory) {
						await tx
							.update(products)
							.set({
								stockQuantity: sql`GREATEST(${products.stockQuantity} - ${item.quantity}, 0)`,
							})
							.where(and(eq(products.id, item.productId), eq(products.facilityId, facilityId)));
					}
				}

				return created;
			});

			return json(order ?? null);
		}

		default:
			return json({ error: `Unknown action: ${action}` }, { status: 400 });
	}
};
