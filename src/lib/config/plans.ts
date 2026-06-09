export type PlanId = "basic" | "pro" | "enterprise";
export type PlanIcon = "Building2" | "Users" | "Zap";

export interface PlanMeta {
	id: PlanId;
	name: string;
	priceId: string;
	descriptionKey: string;
	featureKeys: readonly string[];
	icon: PlanIcon;
	popular: boolean;
}

export const PLANS_META: readonly PlanMeta[] = [
	{
		id: "basic",
		name: "Basic",
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

export interface PlanData extends PlanMeta {
	amount: number;
	currency: string;
	price: string;
}
