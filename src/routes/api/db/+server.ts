import { json } from "@sveltejs/kit";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { mergeSettings } from "$lib/config/settings";
import { type DbClient, getDb } from "$lib/db/client";
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

type UserContext = Awaited<ReturnType<typeof resolveUserContext>>;

type ActionContext = {
	db: DbClient;
	userId: string;
	facilityId: string | null;
	ctx: UserContext;
	data: Record<string, unknown> | undefined;
	filter: Record<string, unknown> | undefined;
};

const invalidRequest = () => json({ error: "Invalid request" }, { status: 400 });

// ── Products ──
async function handleProductsInsert(a: ActionContext): Promise<Response> {
	if (!a.facilityId) return forbidden();
	const parsed = ProductFormSchema.safeParse(a.data);
	if (!parsed.success) return invalidRequest();
	const [row] = await a.db
		.insert(products)
		.values({ ...parsed.data, facilityId: a.facilityId, createdBy: a.userId })
		.returning();
	return json(row ?? null);
}

async function handleProductsUpdate(a: ActionContext): Promise<Response> {
	if (!a.facilityId) return forbidden();
	const parsed = ProductFormSchema.safeParse(a.data);
	if (!parsed.success) return invalidRequest();
	const [row] = await a.db
		.update(products)
		.set(parsed.data)
		.where(and(eq(products.id, idFrom(a.filter)), eq(products.facilityId, a.facilityId)))
		.returning();
	if (!row) return forbidden();
	return json(row);
}

async function handleProductsDelete(a: ActionContext): Promise<Response> {
	if (!a.facilityId) return forbidden();
	const [row] = await a.db
		.delete(products)
		.where(and(eq(products.id, idFrom(a.filter)), eq(products.facilityId, a.facilityId)))
		.returning();
	if (!row) return forbidden();
	return json({ success: true });
}

async function handleProductsSearch(a: ActionContext): Promise<Response> {
	if (!a.facilityId) return forbidden();
	const text = String(a.data?.searchText ?? "");
	const rows = await a.db
		.select()
		.from(products)
		.where(
			and(
				eq(products.facilityId, a.facilityId),
				text ? sql`${products.name} ILIKE ${`%${escapeLike(text)}%`}` : undefined,
			),
		)
		.orderBy(products.name)
		.limit(20);
	return json(rows);
}

// ── Categories ──
async function handleCategoriesInsert(a: ActionContext): Promise<Response> {
	if (!a.facilityId) return forbidden();
	const parsed = CategoryFormSchema.safeParse(a.data);
	if (!parsed.success) return invalidRequest();
	const [row] = await a.db
		.insert(categories)
		.values({ ...parsed.data, facilityId: a.facilityId })
		.returning();
	return json(row ?? null);
}

async function handleCategoriesUpdate(a: ActionContext): Promise<Response> {
	if (!a.facilityId) return forbidden();
	const parsed = CategoryFormSchema.safeParse(a.data);
	if (!parsed.success) return invalidRequest();
	const [row] = await a.db
		.update(categories)
		.set(parsed.data)
		.where(and(eq(categories.id, idFrom(a.filter)), eq(categories.facilityId, a.facilityId)))
		.returning();
	if (!row) return forbidden();
	return json(row);
}

async function handleCategoriesDelete(a: ActionContext): Promise<Response> {
	if (!a.facilityId) return forbidden();
	const [row] = await a.db
		.delete(categories)
		.where(and(eq(categories.id, idFrom(a.filter)), eq(categories.facilityId, a.facilityId)))
		.returning();
	if (!row) return forbidden();
	return json({ success: true });
}

// ── Bookings ──
async function handleBookingsInsert(a: ActionContext): Promise<Response> {
	if (!a.facilityId) return forbidden();
	const parsed = BookingFormSchema.safeParse(a.data);
	if (!parsed.success) return invalidRequest();
	// The DB enforces exclusivity via bookings_no_overlap (drizzle/0004);
	// this re-check just returns a friendlier 409 before hitting it.
	const preventOverlaps = mergeSettings(a.ctx.tenant?.settings ?? null).prevent_overlaps;
	const facilityId = a.facilityId;
	const created = await a.db.transaction(async (tx) => {
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
			.values({ ...parsed.data, facilityId, createdBy: a.userId })
			.returning();
		return row;
	});
	if (!created) return json({ error: "Slot conflicts with an existing booking" }, { status: 409 });
	return json(created);
}

async function handleBookingsUpdate(a: ActionContext): Promise<Response> {
	if (!a.facilityId) return forbidden();
	const parsed = BookingFormSchema.safeParse(a.data);
	if (!parsed.success) return invalidRequest();
	const [row] = await a.db
		.update(bookings)
		.set({ ...parsed.data, updatedAt: sql`now()` })
		.where(and(eq(bookings.id, idFrom(a.filter)), eq(bookings.facilityId, a.facilityId)))
		.returning();
	if (!row) return forbidden();
	return json(row);
}

async function handleBookingsDelete(a: ActionContext): Promise<Response> {
	if (!a.facilityId) return forbidden();
	const [row] = await a.db
		.delete(bookings)
		.where(and(eq(bookings.id, idFrom(a.filter)), eq(bookings.facilityId, a.facilityId)))
		.returning();
	if (!row) return forbidden();
	return json({ success: true });
}

async function handleBookingsCheckConflict(a: ActionContext): Promise<Response> {
	if (!a.facilityId) return forbidden();
	// UI pre-check only; the hard guarantee is the bookings_no_overlap
	// exclusion constraint (drizzle/0004), with the tx re-check in
	// `bookings.insert` as defense-in-depth.
	const conflictFilter = BookingConflictFilterSchema.safeParse(a.filter);
	if (!conflictFilter.success) return invalidRequest();
	const bookingType = conflictFilter.data.type ?? "event";
	const conf = await a.db
		.select({ count: sql<number>`count(*)::int` })
		.from(bookings)
		.where(
			and(
				eq(bookings.facilityId, a.facilityId),
				eq(bookings.type, bookingType),
				sql`${bookings.startsAt} < ${conflictFilter.data.endsAt}::timestamptz`,
				sql`${bookings.endsAt} > ${conflictFilter.data.startsAt}::timestamptz`,
				conflictFilter.data.excludeId ? ne(bookings.id, conflictFilter.data.excludeId) : undefined,
			),
		);
	return json({ conflict: Number(conf[0]?.count ?? 0) > 0 });
}

// ── Register Sessions ──
async function handleRegisterSessionsInsert(a: ActionContext): Promise<Response> {
	if (!a.facilityId) return forbidden();
	const parsed = RegisterSessionOpenSchema.safeParse(a.data);
	if (!parsed.success) return invalidRequest();
	const [row] = await a.db
		.insert(registerSessions)
		.values({ ...parsed.data, facilityId: a.facilityId, openedBy: a.userId })
		.returning();
	return json(row ?? null);
}

async function handleRegisterSessionsClose(a: ActionContext): Promise<Response> {
	if (!a.facilityId) return forbidden();
	const closeFilter = RegisterSessionCloseFilterSchema.safeParse(a.filter);
	if (!closeFilter.success) return invalidRequest();
	const facilityId = a.facilityId;
	const closed = await a.db.transaction(async (tx) => {
		const totals = await tx
			.select({ total: sql<string>`COALESCE(SUM(${orders.totalAmount}), '0')` })
			.from(orders)
			.where(
				and(eq(orders.sessionId, closeFilter.data.sessionId), eq(orders.facilityId, facilityId)),
			);
		const expectedCash = Number(totals[0]?.total ?? 0);
		const [row] = await tx
			.update(registerSessions)
			.set({
				closedBy: a.userId,
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
type OrderProduct = { id: string; name: string; price: number; trackInventory: boolean | null };

type OrderLineItem = {
	productId: string;
	productName: string;
	quantity: number;
	unitPrice: number;
	lineTotal: number;
	isTreat: boolean;
};

async function resolveOrderLineItems(
	db: DbClient,
	facilityId: string,
	items: { productId: string; quantity: number; isTreat?: boolean }[],
): Promise<
	| { ok: true; lineItems: OrderLineItem[]; productById: Map<string, OrderProduct> }
	| { ok: false; response: Response }
> {
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

	const lineItems: OrderLineItem[] = [];
	for (const item of items) {
		const product = productById.get(item.productId);
		if (!product)
			return {
				ok: false,
				response: json(
					{ error: "One or more items are not available in this facility" },
					{ status: 400 },
				),
			};
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
	return { ok: true, lineItems, productById };
}

async function handleOrdersCreate(a: ActionContext): Promise<Response> {
	if (!a.facilityId) return forbidden();
	const facilityId = a.facilityId;
	const orderFilter = OrderCreateFilterSchema.safeParse(a.filter);
	if (!orderFilter.success) return json({ error: "No items" }, { status: 400 });

	const { items, couponCount = 0 } = orderFilter.data;

	const resolved = await resolveOrderLineItems(a.db, facilityId, items);
	if (!resolved.ok) return resolved.response;

	const session = await a.db
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

	const { lineItems, productById } = resolved;
	const subtotal = lineItems.reduce((s, i) => s + i.lineTotal, 0);
	const couponValue = mergeSettings(a.ctx.tenant?.settings ?? null).coupons_value;
	const discountAmount = couponCount * couponValue;
	const totalAmount = Math.max(0, subtotal - discountAmount);

	const order = await a.db.transaction(async (tx) => {
		const [created] = await tx
			.insert(orders)
			.values({
				facilityId,
				sessionId: orderFilter.data.sessionId,
				subtotal,
				discountAmount,
				totalAmount,
				couponCount,
				createdBy: a.userId,
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

const ACTION_HANDLERS: Record<DbAction, (a: ActionContext) => Promise<Response>> = {
	"products.insert": handleProductsInsert,
	"products.update": handleProductsUpdate,
	"products.delete": handleProductsDelete,
	"products.search": handleProductsSearch,
	"categories.insert": handleCategoriesInsert,
	"categories.update": handleCategoriesUpdate,
	"categories.delete": handleCategoriesDelete,
	"bookings.insert": handleBookingsInsert,
	"bookings.update": handleBookingsUpdate,
	"bookings.delete": handleBookingsDelete,
	"bookings.checkConflict": handleBookingsCheckConflict,
	"registerSessions.insert": handleRegisterSessionsInsert,
	"registerSessions.close": handleRegisterSessionsClose,
	"orders.create": handleOrdersCreate,
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

	const handler = ACTION_HANDLERS[action];
	return handler({ db, userId, facilityId, ctx, data, filter });
};
