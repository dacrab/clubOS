// ClubOS Database Types v2.0
// Auto-generated from Supabase schema

export type UserRole = "admin" | "secretary" | "staff";
export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
export type OrderStatus = "pending" | "completed" | "refunded" | "voided";
export type PaymentMethod = "cash" | "card" | "mixed" | "coupon" | "other";

// ============================================================================
// Core Tables
// ============================================================================

export interface User {
	id: string;
	username: string;
	email: string | null;
	full_name: string | null;
	avatar_url: string | null;
	role: UserRole;
	is_active: boolean;
	last_login_at: string | null;
	created_at: string;
	updated_at: string;
}

export interface Tenant {
	id: string;
	name: string;
	slug: string;
	logo_url: string | null;
	is_active: boolean;
	created_at: string;
	updated_at: string;
}

export interface TenantMember {
	id: string;
	tenant_id: string;
	user_id: string;
	is_default: boolean;
	created_at: string;
}

export interface Facility {
	id: string;
	tenant_id: string;
	name: string;
	address: string | null;
	phone: string | null;
	email: string | null;
	is_active: boolean;
	timezone: string;
	created_at: string;
	updated_at: string;
}

export interface FacilityMember {
	id: string;
	facility_id: string;
	user_id: string;
	is_default: boolean;
	created_at: string;
}

// ============================================================================
// Business Tables
// ============================================================================

export interface Category {
	id: string;
	tenant_id: string;
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
	created_by: string | null;
}

export interface Product {
	id: string;
	tenant_id: string;
	facility_id: string;
	category_id: string | null;
	sku: string | null;
	barcode: string | null;
	name: string;
	description: string | null;
	price: number;
	cost_price: number | null;
	stock_quantity: number;
	min_stock_level: number | null;
	max_stock_level: number | null;
	track_inventory: boolean;
	allow_negative_stock: boolean;
	is_available: boolean;
	is_taxable: boolean;
	image_url: string | null;
	sort_order: number;
	created_at: string;
	updated_at: string;
	created_by: string | null;
	// Virtual/joined fields
	category?: Category;
}

// ============================================================================
// Transaction Tables
// ============================================================================

export interface RegisterSession {
	id: string;
	tenant_id: string;
	facility_id: string;
	opened_by: string;
	closed_by: string | null;
	opened_at: string;
	closed_at: string | null;
	opening_cash: number;
	closing_cash: number | null;
	expected_cash: number | null;
	cash_difference: number | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
	// Virtual/joined fields
	opened_by_user?: User;
	closed_by_user?: User;
	closing?: RegisterClosing;
	orders?: Order[];
}

export interface Order {
	id: string;
	tenant_id: string;
	facility_id: string;
	session_id: string | null;
	order_number: number;
	status: OrderStatus;
	payment_method: PaymentMethod;
	subtotal: number;
	tax_amount: number;
	discount_amount: number;
	total_amount: number;
	coupon_count: number;
	cash_received: number | null;
	change_given: number | null;
	customer_name: string | null;
	customer_phone: string | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
	created_by: string;
	// Virtual/joined fields
	created_by_user?: User;
	items?: OrderItem[];
}

export interface OrderItem {
	id: string;
	order_id: string;
	product_id: string;
	product_name: string;
	quantity: number;
	unit_price: number;
	discount_amount: number;
	line_total: number;
	is_treat: boolean;
	is_deleted: boolean; // Soft delete flag
	deleted_at: string | null;
	deleted_by: string | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
	// Virtual/joined fields
	product?: Product;
}

export interface RegisterClosing {
	id: string;
	session_id: string;
	orders_count: number;
	orders_total: number;
	cash_total: number;
	card_total: number;
	coupon_total: number;
	treat_count: number;
	treat_value: number;
	discount_total: number;
	refund_count: number;
	refund_total: number;
	notes: string | null;
	created_at: string;
	updated_at: string;
}

// ============================================================================
// Booking Tables
// ============================================================================

export interface Appointment {
	id: string;
	tenant_id: string;
	facility_id: string;
	customer_name: string;
	contact_info: string;
	appointment_date: string;
	end_date: string | null;
	duration_minutes: number;
	num_children: number;
	num_adults: number;
	package_type: string | null;
	total_price: number | null;
	deposit_amount: number | null;
	deposit_paid: boolean;
	status: BookingStatus;
	notes: string | null;
	internal_notes: string | null;
	reminder_sent: boolean;
	created_at: string;
	updated_at: string;
	created_by: string;
	cancelled_by: string | null;
	cancelled_at: string | null;
	cancellation_reason: string | null;
	// Virtual/joined fields
	created_by_user?: User;
}

export interface FootballBooking {
	id: string;
	tenant_id: string;
	facility_id: string;
	customer_name: string;
	contact_info: string;
	booking_datetime: string;
	end_datetime: string | null;
	duration_minutes: number;
	field_number: number;
	num_players: number;
	total_price: number | null;
	deposit_amount: number | null;
	deposit_paid: boolean;
	is_recurring: boolean;
	recurring_pattern: string | null;
	status: BookingStatus;
	notes: string | null;
	internal_notes: string | null;
	reminder_sent: boolean;
	created_at: string;
	updated_at: string;
	created_by: string;
	cancelled_by: string | null;
	cancelled_at: string | null;
	cancellation_reason: string | null;
	// Virtual/joined fields
	created_by_user?: User;
}

// ============================================================================
// Configuration Tables
// ============================================================================

export interface TenantSettings {
	id: string;
	tenant_id: string;
	facility_id: string | null;
	// Inventory settings
	low_stock_threshold: number;
	allow_unlimited_stock: boolean;
	negative_stock_allowed: boolean;
	default_category_sort: string;
	products_page_size: number;
	image_max_size_mb: number;
	// Sales settings
	coupons_value: number;
	allow_treats: boolean;
	require_open_register_for_sale: boolean;
	currency_code: string;
	tax_rate_percent: number;
	tax_inclusive: boolean;
	receipt_header_text: string | null;
	receipt_footer_text: string | null;
	print_receipt_by_default: boolean;
	// Booking settings
	booking_default_duration_min: number;
	football_default_duration_min: number;
	football_fields_count: number;
	appointment_buffer_min: number;
	prevent_overlaps: boolean;
	allow_online_bookings: boolean;
	require_deposit: boolean;
	default_deposit_percent: number | null;
	send_booking_reminders: boolean;
	reminder_hours_before: number | null;
	// Appearance settings
	theme_default: string;
	default_locale: string;
	date_format: string;
	time_format: string;
	first_day_of_week: number;
	// Business hours
	business_hours: BusinessHours | null;
	created_at: string;
	updated_at: string;
}

export interface BusinessHours {
	mon?: DayHours;
	tue?: DayHours;
	wed?: DayHours;
	thu?: DayHours;
	fri?: DayHours;
	sat?: DayHours;
	sun?: DayHours;
}

export interface DayHours {
	open: string;
	close: string;
	closed?: boolean;
}

export interface UserPreferences {
	id: string;
	user_id: string;
	theme: string | null;
	locale: string | null;
	collapsed_sidebar: boolean;
	dense_table_mode: boolean;
	items_per_page: number | null;
	email_notifications: boolean;
	push_notifications: boolean;
	dashboard_layout: Record<string, unknown> | null;
	pinned_products: string[] | null;
	created_at: string;
	updated_at: string;
}

// ============================================================================
// API/Helper Types
// ============================================================================

export interface SessionUser {
	id: string;
	username: string;
	email: string | null;
	full_name: string | null;
	avatar_url: string | null;
	role: UserRole;
	tenantId: string;
	facilityId: string;
}

export interface FormatSettings {
	date_format: string;
	time_format: string;
	currency_code: string;
}

// ============================================================================
// Insert/Update Types (for Supabase operations)
// ============================================================================

export type UserInsert = Omit<User, "created_at" | "updated_at">;
export type UserUpdate = Partial<Omit<User, "id" | "created_at">>;

export type ProductInsert = Omit<Product, "id" | "created_at" | "updated_at" | "category">;
export type ProductUpdate = Partial<Omit<Product, "id" | "created_at" | "category">>;

export type CategoryInsert = Omit<Category, "id" | "created_at" | "updated_at">;
export type CategoryUpdate = Partial<Omit<Category, "id" | "created_at">>;

export type OrderInsert = Omit<Order, "id" | "order_number" | "created_at" | "updated_at" | "created_by_user" | "items">;
export type OrderUpdate = Partial<Omit<Order, "id" | "order_number" | "created_at" | "created_by_user" | "items">>;

export type OrderItemInsert = Omit<OrderItem, "id" | "created_at" | "updated_at" | "product">;
export type OrderItemUpdate = Partial<Omit<OrderItem, "id" | "created_at" | "product">>;

export type AppointmentInsert = Omit<Appointment, "id" | "created_at" | "updated_at" | "created_by_user">;
export type AppointmentUpdate = Partial<Omit<Appointment, "id" | "created_at" | "created_by_user">>;

export type FootballBookingInsert = Omit<FootballBooking, "id" | "created_at" | "updated_at" | "created_by_user">;
export type FootballBookingUpdate = Partial<Omit<FootballBooking, "id" | "created_at" | "created_by_user">>;

export type TenantSettingsInsert = Omit<TenantSettings, "id" | "created_at" | "updated_at">;
export type TenantSettingsUpdate = Partial<Omit<TenantSettings, "id" | "created_at">>;
