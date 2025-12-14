import { describe, it, expect } from "vitest";
import { load } from "./+page.server";
import { createMockLocals, scenarios } from "$lib/testing/mocks";

describe("Root Page Server Load", () => {
	it("returns empty data for unauthenticated users", async () => {
		const locals = createMockLocals();
		locals.user = null;

		const result = await load({ locals } as never);
		expect(result).toEqual({});
	});

	it("redirects users without membership to onboarding", async () => {
		const locals = createMockLocals(scenarios.needsOnboarding());

		await expect(load({ locals } as never)).rejects.toMatchObject({
			status: 307,
			location: "/onboarding",
		});
	});

	it("redirects owners and admins to /admin", async () => {
		await Promise.all(
			(["owner", "admin"] as const).map(async (role) => {
				const locals = createMockLocals(scenarios.activeSubscription(role));
				await expect(load({ locals } as never)).rejects.toMatchObject({
					status: 307,
					location: "/admin",
				});
			}),
		);
	});

	it("redirects managers to /secretary", async () => {
		const locals = createMockLocals(scenarios.activeSubscription("manager"));

		await expect(load({ locals } as never)).rejects.toMatchObject({
			status: 307,
			location: "/secretary",
		});
	});

	it("redirects staff to /staff", async () => {
		const locals = createMockLocals(scenarios.activeSubscription("staff"));

		await expect(load({ locals } as never)).rejects.toMatchObject({
			status: 307,
			location: "/staff",
		});
	});
});
