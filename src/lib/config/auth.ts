import type { MemberRole } from "$lib/types/database";

export type Plan = "basic" | "pro" | "enterprise";
export type PlanIcon = "Building2" | "Users" | "Zap";

interface PlanDef {
	id: Plan;
	name: string;
	price: string;
	priceId: string;
	descriptionKey: string;
	featureKeys: readonly string[];
	icon: PlanIcon;
	popular: boolean;
}

export const PLANS: readonly PlanDef[] = [
	{
		id: "basic",
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
		id: "pro",
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
		id: "enterprise",
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
];

const ROLE_HOME: Record<MemberRole, string> = {
	owner: "/admin",
	admin: "/admin",
	manager: "/secretary",
	staff: "/staff",
};

export const getHomeForRole = (role: MemberRole | null): string => (role ? ROLE_HOME[role] : "/");
