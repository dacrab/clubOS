import type { MemberRole, RoleBadgeVariant, ProductRef, OrderItemView } from "$lib/types/database";

export const getRoleBadgeVariant = (role: MemberRole | undefined): RoleBadgeVariant =>
	role === "owner" ? "destructive" : role === "admin" ? "default" : role === "manager" ? "secondary" : "outline";

export const shortId = (id: string): string => id.slice(0, 8);

export const getProductName = (p: ProductRef): string =>
	Array.isArray(p) ? p[0]?.name ?? "Unknown" : p?.name ?? "Unknown";

export const getActiveOrderItems = (items: OrderItemView[]): OrderItemView[] =>
	items?.filter((i) => !i.is_deleted) ?? [];
