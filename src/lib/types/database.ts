import type { bookings } from "$lib/db/schema/bookings";
import type { products } from "$lib/db/schema/products";
import type { registerSessions } from "$lib/db/schema/register-sessions";

export type MemberRole = "owner" | "admin" | "manager" | "staff";
export type BookingType = "birthday" | "football" | "event" | "other";
export type BookingStatus = "pending" | "confirmed" | "canceled" | "completed" | "no_show";

export const SUBSCRIPTION_STATUSES = [
	"trialing",
	"active",
	"canceled",
	"past_due",
	"unpaid",
	"paused",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const DB_ACTIONS = [
	"products.insert",
	"products.update",
	"products.delete",
	"products.search",
	"categories.insert",
	"categories.update",
	"categories.delete",
	"bookings.insert",
	"bookings.update",
	"bookings.delete",
	"bookings.checkConflict",
	"registerSessions.insert",
	"registerSessions.close",
	"orders.create",
] as const;
export type DbAction = (typeof DB_ACTIONS)[number];

export const USERS_PER_PAGE = 200;
export const TRIAL_DAYS = 14;
export const DEFAULT_TIMEZONE = "Europe/Athens";
export const DAY_MS = 86_400_000;

export type Product = typeof products.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type RegisterSession = typeof registerSessions.$inferSelect;

/** Persisted JSONB shape — keys are storage format, do not rename. */
export interface BookingDetails {
	field_number?: string;
	num_players?: number;
	num_children?: number;
	num_adults?: number;
	package_type?: string;
}

export type ProductRef = { id: string; name: string } | null;

export interface OrderItemView {
	id: string;
	quantity: number;
	unitPrice: number;
	lineTotal: number;
	isTreat: boolean;
	isDeleted: boolean;
	productRef: ProductRef;
}

export interface OrderView {
	id: string;
	sessionId?: string | null;
	createdAt: string;
	subtotal: number;
	discountAmount: number;
	totalAmount: number;
	couponCount: number;
	orderItems: OrderItemView[];
}

export interface CategoryPartial {
	id: string;
	name: string;
	parentId: string | null;
	description: string | null;
}

export interface ProductForm {
	name: string;
	description: string;
	price: number;
	stockQuantity: number;
	categoryId: string;
	imageUrl: string;
}

export interface UserView {
	id: string;
	email: string;
	fullName: string | null;
	role: MemberRole;
}

export interface UserForm {
	fullName: string;
	email: string;
	password: string;
	role: MemberRole;
}

export interface CartItem {
	product: Product;
	quantity: number;
	isTreat: boolean;
}

export interface SessionUser {
	id: string;
	fullName: string | null;
	role: MemberRole;
	tenantId: string | null;
	facilityId: string | null;
}
