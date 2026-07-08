import type { MemberRole, OrderItemView, ProductRef } from "$lib/types/database";

type BadgeVariant = "destructive" | "default" | "secondary" | "outline";

export const getRoleBadgeVariant = (role: MemberRole | undefined): BadgeVariant =>
	role === "owner"
		? "destructive"
		: role === "admin"
			? "default"
			: role === "manager"
				? "secondary"
				: "outline";

export const shortId = (id: string): string => id.slice(0, 8);

export const getProductName = (p: ProductRef): string => p?.name ?? "Unknown";

export const getActiveOrderItems = (items: OrderItemView[]): OrderItemView[] =>
	items?.filter((i) => !i.is_deleted) ?? [];
