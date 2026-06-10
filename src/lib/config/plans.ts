export type PlanId = "basic" | "pro" | "enterprise";
export type PlanIcon = "Building2" | "Users" | "Zap";

export interface PlanMeta {
	id: PlanId;
	name: string;
	productId: string;
	amount: number;
	currency: string;
	descriptionKey: string;
	featureKeys: readonly string[];
	icon: PlanIcon;
	popular: boolean;
}

export const PLANS_META: readonly PlanMeta[] = [
	{
		id: "basic",
		name: "Basic",
		productId: "d77854a0-c363-4419-a60b-8e78741d79db",
		amount: 2900,
		currency: "eur",
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
		productId: "5c4ab2ff-333a-444c-aa59-98324c2f6bbe",
		amount: 7900,
		currency: "eur",
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
		productId: "54b1dfa4-ce0e-49db-9a98-6fcae873365d",
		amount: 19900,
		currency: "eur",
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
	price: string;
}
