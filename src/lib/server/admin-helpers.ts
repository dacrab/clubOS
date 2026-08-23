import { and, eq } from "drizzle-orm";
import { getDb } from "$lib/db/client";
import { memberships } from "$lib/db/schema/memberships";
import type { MemberRole } from "$lib/types/database";

export interface AdminCtx {
	tenantId: string;
	callerRole: MemberRole;
}

export async function requireAdmin(userId: string | null): Promise<AdminCtx | Response> {
	if (!userId) return text("Unauthorized", 401);
	const db = getDb();
	const mems = await db
		.select({ tenantId: memberships.tenantId, role: memberships.role })
		.from(memberships)
		.where(and(eq(memberships.userId, userId), eq(memberships.isPrimary, true)))
		.limit(1);

	const m = mems[0];
	if (!m || (m.role !== "owner" && m.role !== "admin")) return text("Forbidden", 403);
	const callerRole = m.role === "owner" ? "owner" : "admin";
	return { tenantId: m.tenantId, callerRole };
}

export function canAssign(caller: MemberRole, target: MemberRole | undefined): boolean {
	return !target || caller === "owner" || target !== "owner";
}

const text = (msg: string, status: number): Response => new Response(msg, { status });
