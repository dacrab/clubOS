import type { BadgeVariant } from "$lib/components/ui/badge/badge.svelte";
import type { BookingStatus, MemberRole, OrderItemView, ProductRef } from "$lib/types/database";

export const getRoleBadgeVariant = (role: MemberRole | undefined): BadgeVariant =>
	role === "owner"
		? "destructive"
		: role === "admin"
			? "default"
			: role === "manager"
				? "secondary"
				: "outline";

export const getBookingStatusBadgeVariant = (status: BookingStatus | undefined): BadgeVariant =>
	status === "confirmed"
		? "success"
		: status === "canceled"
			? "destructive"
			: status === "no_show"
				? "warning"
				: "secondary";

export const shortId = (id: string): string => id.slice(0, 8);

export const getProductName = (p: ProductRef): string => p?.name ?? "Unknown";

export const getActiveOrderItems = (items: OrderItemView[] | null | undefined): OrderItemView[] =>
	items?.filter((i) => !i.is_deleted) ?? [];
