/**
 * Shared utilities for auth and routing
 */

import type { MemberRole } from "$lib/types/database";
import { USER_ROLE } from "$lib/constants";

export type Plan = "basic" | "pro" | "enterprise";

export const PLANS = [
	{
		id: "basic" as Plan,
		name: "Basic",
		price: "€29",
		priceId: "price_1Sc4wV9fJvoeQ48O2RI2I9bl",
		descriptionKey: "signup.plans.basic.description",
		featureKeys: [
			"signup.plans.basic.feature1",
			"signup.plans.basic.feature2",
			"signup.plans.basic.feature3",
			"signup.plans.basic.feature4",
		],
		icon: "Building2",
		popular: false,
	},
	{
		id: "pro" as Plan,
		name: "Pro",
		price: "€59",
		priceId: "price_1Sc4wV9fJvoeQ48Ot0p9YmNm",
		descriptionKey: "signup.plans.pro.description",
		featureKeys: [
			"signup.plans.pro.feature1",
			"signup.plans.pro.feature2",
			"signup.plans.pro.feature3",
			"signup.plans.pro.feature4",
			"signup.plans.pro.feature5",
		],
		icon: "Users",
		popular: true,
	},
	{
		id: "enterprise" as Plan,
		name: "Enterprise",
		price: "€149",
		priceId: "price_1Sc4wV9fJvoeQ48OdmvyM2jy",
		descriptionKey: "signup.plans.enterprise.description",
		featureKeys: [
			"signup.plans.enterprise.feature1",
			"signup.plans.enterprise.feature2",
			"signup.plans.enterprise.feature3",
			"signup.plans.enterprise.feature4",
			"signup.plans.enterprise.feature5",
		],
		icon: "Zap",
		popular: false,
	},
] as const;

export function getHomeForRole(role: MemberRole | string | null): string {
	switch (role) {
		case USER_ROLE.OWNER:
		case USER_ROLE.ADMIN:
			return "/admin";
		case USER_ROLE.MANAGER:
			return "/secretary";
		default:
			return "/staff";
	}
}
