import { describe, expect, it, vi } from "vitest";

vi.mock("$lib/db/client", () => ({
	getDb: () => ({
		select: () => ({
			from: () => ({
				where: () => ({ limit: () => Promise.resolve([]) }),
			}),
		}),
	}),
}));

import type { MemberRole } from "$lib/types/database";
import { canAssign, requireAdmin as rawRequireAdmin } from "./admin-helpers";

const requireAdmin = rawRequireAdmin as (
	userId: string | null,
) => Promise<{ tenantId: string; callerRole: MemberRole } | Response>;

describe("canAssign", () => {
	it("allows when target is undefined", () => {
		expect(canAssign("staff", undefined)).toBe(true);
	});

	it("allows owner to assign any role", () => {
		expect(canAssign("owner", "owner")).toBe(true);
		expect(canAssign("owner", "admin")).toBe(true);
		expect(canAssign("owner", "manager")).toBe(true);
		expect(canAssign("owner", "staff")).toBe(true);
	});

	it("allows non-owner to assign non-owner roles", () => {
		expect(canAssign("admin", "admin")).toBe(true);
		expect(canAssign("admin", "manager")).toBe(true);
		expect(canAssign("admin", "staff")).toBe(true);
		expect(canAssign("manager", "staff")).toBe(true);
	});

	it("prevents non-owner from assigning owner role", () => {
		expect(canAssign("admin", "owner")).toBe(false);
		expect(canAssign("manager", "owner")).toBe(false);
		expect(canAssign("staff", "owner")).toBe(false);
	});
});

describe("requireAdmin", () => {
	it("returns 401 for null userId", async () => {
		const result = await requireAdmin(null);
		expect(result).toBeInstanceOf(Response);
		expect((result as Response).status).toBe(401);
	});

	it("returns 403 when user has no membership", async () => {
		const result = await requireAdmin("non-existent");
		expect(result).toBeInstanceOf(Response);
		expect((result as Response).status).toBe(403);
	});
});
