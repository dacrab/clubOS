import { and, eq, like, sql } from "drizzle-orm";
import { getDb } from "$lib/db/client";
import { categories } from "$lib/db/schema/categories";
import { products } from "$lib/db/schema/products";
import type { CategoryPartial, Product } from "$lib/types/database";
import { mapRows } from "$lib/utils/mapper";
import type { PageServerLoad } from "./$types";

const PER_PAGE = 25;

export const load: PageServerLoad = async ({ parent, url }) => {
	const { user } = await parent();
	const db = getDb();
	const fid: string = user.facilityId ?? "";

	const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
	const from = (page - 1) * PER_PAGE;

	const lowStockProducts = await db
		.select({
			id: products.id,
			facilityId: products.facilityId,
			name: products.name,
			price: products.price,
			stockQuantity: products.stockQuantity,
			categoryId: products.categoryId,
		})
		.from(products)
		.where(
			and(
				eq(products.facilityId, fid),
				eq(products.trackInventory, true),
				sql`stock_quantity <= COALESCE((SELECT settings->>'low_stock_threshold' FROM tenants JOIN facilities ON facilities.tenant_id = tenants.id WHERE facilities.id = ${fid})::int, 3)`,
			),
		)
		.orderBy(products.name);

	const categoriesResult = await db
		.select({
			id: categories.id,
			name: categories.name,
			parentId: categories.parentId,
			description: categories.description,
		})
		.from(categories)
		.where(eq(categories.facilityId, fid))
		.orderBy(categories.name);

	const search = url.searchParams.get("search");

	let countResult: Array<{ count: number }>;
	if (search) {
		countResult = await db
			.select({ count: sql<number>`count(*)` })
			.from(products)
			.where(and(eq(products.facilityId, fid), like(products.name, `%${search}%`)));
	} else {
		countResult = await db
			.select({ count: sql<number>`count(*)` })
			.from(products)
			.where(eq(products.facilityId, fid));
	}

	const totalCount = Number(countResult[0]?.count ?? 0);

	let query = db
		.select()
		.from(products)
		.where(eq(products.facilityId, fid))
		.orderBy(products.name)
		.limit(PER_PAGE)
		.offset(from);

	if (search) {
		query = db
			.select()
			.from(products)
			.where(and(eq(products.facilityId, fid), like(products.name, `%${search}%`)))
			.orderBy(products.name)
			.limit(PER_PAGE)
			.offset(from);
	}

	const paginatedProducts = await query;

	return {
		lowStockProducts: mapRows<Product>(lowStockProducts),
		paginatedProducts: mapRows<Product>(paginatedProducts),
		categories: mapRows<CategoryPartial>(categoriesResult ?? []),
		page,
		totalPages: Math.ceil(totalCount / PER_PAGE),
	};
};
