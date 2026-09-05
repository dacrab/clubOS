import { eq, inArray, type SQL, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { getDb } from "$lib/db/client";
import { facilities } from "$lib/db/schema/facilities";

export interface DataScope {
	tenantId: string | null;
	facilityId: string | null;
}

/**
 * Resolve the facility ids a caller may read: their own facility, or every
 * facility in their tenant for tenant-wide members (facilityId === null).
 */
export async function resolveFacilityIds(s: DataScope): Promise<string[]> {
	if (s.facilityId) return [s.facilityId];
	if (!s.tenantId) return [];
	const rows = await getDb()
		.select({ id: facilities.id })
		.from(facilities)
		.where(eq(facilities.tenantId, s.tenantId));
	return rows.map((r) => r.id);
}

export function facilityFilter(col: AnyPgColumn, ids: string[]): SQL {
	return ids.length ? inArray(col, ids) : sql`false`;
}

/**
 * SQL expression for the caller's effective low-stock threshold: the tenant's
 * setting resolved via the caller's facility, or directly for tenant-wide
 * members (facilityId === null), falling back to 3.
 */
export function lowStockThreshold(s: DataScope): SQL {
	return s.facilityId
		? sql`COALESCE((SELECT settings->>'low_stock_threshold' FROM tenants JOIN facilities ON facilities.tenant_id = tenants.id WHERE facilities.id = ${s.facilityId})::int, 3)`
		: sql`COALESCE((SELECT settings->>'low_stock_threshold' FROM tenants WHERE id = ${s.tenantId})::int, 3)`;
}
