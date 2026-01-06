/**
 * ClubOS Database Types
 * Matches the current database schema (migrations 0001-0005)
 */

// =============================================================================
// ENUMS
// =============================================================================

export type MemberRole = "owner" | "admin" | "manager" | "staff";
export type BookingType = "birthday" | "football" | "event" | "other";
export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
export type OrderStatus = "pending" | "completed" | "refunded" | "voided";
export type PaymentMethod = "cash" | "card" | "mixed" | "coupon" | "other";
export type SubscriptionStatus = "trialing" | "active" | "canceled" | "past_due" | "unpaid" | "paused";

// =============================================================================
// CORE TABLES
// =============================================================================

export interface Tenant {
	id: string;
	name: string;
	slug: string;
	logo_url: string | null;
	settings: TenantSettings | null;
	is_active: boolean;
	created_at: string;
	updated_at: string;
}

// TenantSettings is defined in $lib/config/settings.ts - import from there
import type { TenantSettings } from "$lib/config/settings";
export type { TenantSettings };

export interface Subscription {
	id: string;
	tenant_id: string;
	stripe_subscription_id: string | null;
	stripe_customer_id: string | null;
	status: SubscriptionStatus;
	plan_name: string | null;
	current_period_start: string | null;
	current_period_end: string | null;
	trial_end: string | null;
	created_at: string;
	updated_at: string;
}

export interface Facility {
	id: string;
	tenant_id: string;
	name: string;
	address: string | null;
	phone: string | null;
	email: string | null;
	timezone: string;
	settings: FacilitySettings | null;
	is_active: boolean;
	created_at: string;
	updated_at: string;
}

export interface FacilitySettings {
	opening_time?: string;
	closing_time?: string;
	[key: string]: unknown;
}

export interface User {
	id: string;
	email: string;
	full_name: string | null;
	avatar_url: string | null;
	phone: string | null;
	is_active: boolean;
	last_sign_in_at: string | null;
	created_at: string;
	updated_at: string;
}

export interface Membership {
	id: string;
	user_id: string;
	tenant_id: string;
	facility_id: string | null;
	role: MemberRole;
	is_primary: boolean;
	created_at: string;
	updated_at: string;
	// Joined fields
	user?: User;
	tenant?: Tenant;
	facility?: Facility;
}

// =============================================================================
// BUSINESS TABLES
// =============================================================================

export interface Category {
	id: string;
	facility_id: string;
	parent_id: string | null;
	name: string;
	description: string | null;
	color: string | null;
	icon: string | null;
	sort_order: number;
	is_active: boolean;
	created_at: string;
	updated_at: string;
}

export interface Product {
	id: string;
	facility_id: string;
	category_id: string | null;
	name: string;
	description: string | null;
	price: number;
	cost_price: number | null;
	stock_quantity: number;
	track_inventory: boolean;
	is_available: boolean;
	image_url: string | null;
	sort_order: number;
	created_at: string;
	updated_at: string;
	created_by: string | null;
	// Joined fields
	category?: Category;
}

// =============================================================================
// TRANSACTION TABLES
// =============================================================================

export interface RegisterSession {
	id: string;
	facility_id: string;
	opened_by: string;
	closed_by: string | null;
	opened_at: string;
	closed_at: string | null;
	opening_cash: number;
	closing_cash: number | null;
	expected_cash: number | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
	// Joined fields
	opened_by_user?: User;
	closed_by_user?: User;
}

export interface Order {
	id: string;
	facility_id: string;
	session_id: string | null;
	status: OrderStatus;
	payment_method: PaymentMethod | null;
	subtotal: number;
	tax_amount: number;
	discount_amount: number;
	total_amount: number;
	coupon_count: number;
	cash_received: number | null;
	change_given: number | null;
	customer_name: string | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
	created_by: string;
	// Joined fields
	items?: OrderItem[];
	created_by_user?: User;
}

export interface OrderItem {
	id: string;
	order_id: string;
	product_id: string | null;
	product_name: string;
	quantity: number;
	unit_price: number;
	line_total: number;
	is_treat: boolean;
	is_deleted: boolean;
	deleted_at: string | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
	// Joined fields
	product?: Product;
}

// =============================================================================
// BOOKING TABLE (Unified)
// =============================================================================

export interface Booking {
	id: string;
	facility_id: string;
	type: BookingType;
	customer_name: string;
	customer_phone: string | null;
	customer_email: string | null;
	starts_at: string;
	ends_at: string;
	status: BookingStatus;
	total_price: number | null;
	deposit_amount: number | null;
	deposit_paid: boolean;
	notes: string | null;
	internal_notes: string | null;
	details: BookingDetails;
	created_at: string;
	updated_at: string;
	created_by: string;
	cancelled_at: string | null;
	cancelled_by: string | null;
	// Joined fields
	created_by_user?: User;
}

export interface BookingDetails {
	// Football specific
	field_number?: string;
	num_players?: number;
	// Birthday specific
	num_children?: number;
	num_adults?: number;
	package_type?: string;
	// Generic
	[key: string]: unknown;
}

// =============================================================================
// SESSION/AUTH TYPES
// =============================================================================

export interface SessionUser {
	id: string;
	email: string;
	username: string;
	role: MemberRole;
	tenantId: string | null;
	facilityId: string | null;
}

// =============================================================================
// FORMAT SETTINGS (for UI)
// =============================================================================

export interface FormatSettings {
	date_format?: string;
	time_format?: string;
	currency_code?: string;
}
