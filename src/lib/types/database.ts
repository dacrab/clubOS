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

export const PRODUCTS_LIMIT = 500;
export const CATEGORIES_LIMIT = 100;
export const USERS_PER_PAGE = 200;
export const TRIAL_DAYS = 14;
export const DEFAULT_TIMEZONE = "Europe/Athens";
export const DAY_MS = 86_400_000;

export interface Product {
	id: string;
	facility_id: string;
	category_id: string | null;
	name: string;
	description: string | null;
	price: number;
	stock_quantity: number;
	track_inventory: boolean;
	image_url: string | null;
	search_vector: string | null;
	created_at: string;
	updated_at: string;
	created_by: string | null;
}

export interface Booking {
	id: string;
	facility_id: string;
	type: BookingType;
	status: BookingStatus;
	customer_name: string;
	customer_phone: string | null;
	customer_email: string | null;
	starts_at: string;
	ends_at: string;
	details: BookingDetails;
	notes: string | null;
	created_at: string;
	updated_at: string;
	created_by: string;
}

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
	unit_price: number;
	line_total: number;
	is_treat: boolean;
	is_deleted: boolean;
	product_ref: ProductRef;
}

export interface OrderView {
	id: string;
	session_id?: string | null;
	created_at: string;
	subtotal: number;
	discount_amount: number;
	total_amount: number;
	coupon_count: number;
	order_items: OrderItemView[];
}

export interface CategoryPartial {
	id: string;
	name: string;
	parent_id: string | null;
	description: string | null;
}

export interface ProductForm {
	name: string;
	description: string;
	price: number;
	stock_quantity: number;
	category_id: string;
	image_url: string;
}

export interface UserView {
	id: string;
	email: string;
	full_name: string | null;
	role: MemberRole;
}

export interface UserForm {
	full_name: string;
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
	email: string;
	username: string;
	role: MemberRole;
	tenantId: string | null;
	facilityId: string | null;
}

export interface RegisterSession {
	id: string;
	facility_id: string;
	opened_by: string;
	closed_by: string | null;
	opened_at: string;
	closed_at: string | null;
	opening_cash: string;
	closing_cash: string | null;
	expected_cash: string | null;
	notes: string | null;
	created_at: string;
}
