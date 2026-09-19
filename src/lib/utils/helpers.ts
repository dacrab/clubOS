import type { BookingStatus, MemberRole, OrderItemView } from "$lib/types/database";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "success" | "warning";

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

/** Narrow an unknown JSON value to a plain object; null for arrays and primitives. */
export function asRecord(value: unknown): Record<string, unknown> | null {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
	return value as Record<string, unknown>;
}

/** Escape SQL LIKE wildcards so user input matches literally. */
export const escapeLike = (s: string): string => s.replace(/[\\%_]/g, "\\$&");

export const getActiveOrderItems = (items: OrderItemView[] | null | undefined): OrderItemView[] =>
	items?.filter((i) => !i.isDeleted) ?? [];
