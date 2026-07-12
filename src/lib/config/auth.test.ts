import { describe, expect, it } from "vitest";
import type { MemberRole } from "$lib/types/database";
import { getHomeForRole } from "./auth";

describe("getHomeForRole", () => {
	it.each([
		["owner", "/admin"],
		["admin", "/admin"],
		["manager", "/secretary"],
		["staff", "/staff"],
	] as const)("maps %s -> %s", (role, home) => {
		expect(getHomeForRole(role)).toBe(home);
	});

	it("falls back to / for null role", () => {
		expect(getHomeForRole(null)).toBe("/");
	});

	it("returns undefined for an unknown role", () => {
		expect(getHomeForRole("unknown" as MemberRole)).toBeUndefined();
	});
});
