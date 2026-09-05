import { and, eq, like, sql } from "drizzle-orm";
import { getDb } from "$lib/db/client";
import { categories } from "$lib/db/schema/categories";
import { products } from "$lib/db/schema/products";
import { facilityFilter, lowStockThreshold, resolveFacilityIds } from "$lib/server/scope";
import { escapeLike } from "$lib/utils/helpers";
import type { PageServerLoad } from "./$types";

const PER_PAGE = 25;

export const load: PageServerLoad = async ({ parent, url }) => {
	const { user } = await parent();
	const db = getDb();
	const scope = { tenantId: user.tenantId, facilityId: user.facilityId };
	const fids = await resolveFacilityIds(scope);

	const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
	const from = (page - 1) * PER_PAGE;

	if (!fids.length) {
		return {
			lowStockProducts: [],
			paginatedProducts: [],
			categories: [],
			page,
			totalPages: 0,
		};
	}

	const thresholdExpr = lowStockThreshold(scope);

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
				facilityFilter(products.facilityId, fids),
				eq(products.trackInventory, true),
				sql`${products.stockQuantity} <= ${thresholdExpr}`,
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
		.where(facilityFilter(categories.facilityId, fids))
		.orderBy(categories.name);

	const search = url.searchParams.get("search");
	const searchClause = search ? like(products.name, `%${escapeLike(search)}%`) : undefined;
	const whereClause = searchClause
		? and(facilityFilter(products.facilityId, fids), searchClause)
		: facilityFilter(products.facilityId, fids);

	const countResult = await db
		.select({ count: sql<number>`count(*)` })
		.from(products)
		.where(whereClause);
	const totalCount = Number(countResult[0]?.count ?? 0);

	const paginatedProducts = await db
		.select()
		.from(products)
		.where(whereClause)
		.orderBy(products.name)
		.limit(PER_PAGE)
		.offset(from);

	return {
		lowStockProducts,
		paginatedProducts,
		categories: categoriesResult,
		page,
		totalPages: Math.ceil(totalCount / PER_PAGE),
	};
};
