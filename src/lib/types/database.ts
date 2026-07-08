export type MemberRole = "owner" | "admin" | "manager" | "staff";
export type BookingType = "birthday" | "football" | "event" | "other";
export type BookingStatus = "pending" | "confirmed" | "canceled" | "completed" | "no_show";
export type SubscriptionStatus =
	| "trialing"
	| "active"
	| "canceled"
	| "past_due"
	| "unpaid"
	| "paused";

export const PRODUCTS_LIMIT = 500;
export const CATEGORIES_LIMIT = 100;
export const USERS_PER_PAGE = 200;
export const TRIAL_DAYS = 14;
export const DEFAULT_TIMEZONE = "UTC";

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
	[key: string]: unknown;
}

/** Product reference in order item. */
export type ProductRef = { id: string; name: string } | null;

export interface OrderItemView {
	id: string;
	quantity: number;
	unit_price: number;
	line_total: number;
	is_treat: boolean;
	is_deleted: boolean;
	products: ProductRef;
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
