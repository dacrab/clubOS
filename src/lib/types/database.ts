/**
 * ClubOS Database Types
 * Matches simplified schema (migration 0009)
 */

// =============================================================================
// ENUMS
// =============================================================================

export type MemberRole = "owner" | "admin" | "manager" | "staff";
export type BookingType = "birthday" | "football" | "event" | "other";
export type BookingStatus = "pending" | "confirmed" | "canceled" | "completed" | "no_show";
export type SubscriptionStatus = "trialing" | "active" | "canceled" | "past_due" | "unpaid" | "paused";

// =============================================================================
// CORE TABLES
// =============================================================================

export interface Tenant {
	id: string;
	name: string;
	slug: string;
	settings: TenantSettings | null;
	created_at: string;
	updated_at: string;
}

import type { TenantSettings } from "$lib/config/settings";
export type { TenantSettings };

export interface Subscription {
	id: string;
	tenant_id: string;
	stripe_subscription_id: string | null;
	stripe_customer_id: string | null;
	status: SubscriptionStatus;
	plan_name: string | null;
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
	created_at: string;
	updated_at: string;
}

export interface User {
	id: string;
	full_name: string | null;
	avatar_url: string | null;
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
	stock_quantity: number;
	track_inventory: boolean;
	image_url: string | null;
	created_at: string;
	updated_at: string;
	created_by: string | null;
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
	opened_at: string | null; // When first order was placed (auto-set)
	closed_at: string | null;
	opening_cash: number;
	closing_cash: number | null;
	expected_cash: number | null;
	notes: string | null;
	summary: RegisterSummary | null;
	created_at: string; // When session was created/opened by staff
	opened_by_user?: User;
	closed_by_user?: User;
}

export interface RegisterSummary {
	orders_count: number;
	total_sales: number;
	total_discount: number;
	coupons_used: number;
	cash_variance: number;
}

export interface Order {
	id: string;
	facility_id: string;
	session_id: string | null;
	subtotal: number;
	discount_amount: number;
	total_amount: number;
	coupon_count: number;
	created_at: string;
	created_by: string;
	items?: OrderItem[];
	created_by_user?: User;
}

export interface OrderItem {
	id: string;
	order_id: string;
	product_id: string;
	product_name: string;
	quantity: number;
	unit_price: number;
	line_total: number;
	is_treat: boolean;
	is_deleted: boolean;
	created_at: string;
	product?: Product;
}

// =============================================================================
// BOOKING TABLE
// =============================================================================

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
	total_price: number | null;
	deposit_amount: number | null;
	deposit_paid: boolean;
	notes: string | null;
	internal_notes: string | null;
	created_at: string;
	updated_at: string;
	created_by: string;
	created_by_user?: User;
}

export interface BookingDetails {
	field_number?: string;
	num_players?: number;
	num_children?: number;
	num_adults?: number;
	package_type?: string;
	[key: string]: unknown;
}

// =============================================================================
// SESSION/AUTH TYPES
// =============================================================================

// SessionUser is defined in $lib/state/session.svelte.ts
export type { SessionUser } from "$lib/state/session.svelte";
