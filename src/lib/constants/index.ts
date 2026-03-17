/**
 * Application-wide constants to eliminate magic strings
 */

// Booking statuses (note: "canceled" uses American spelling to match database)
export const BOOKING_STATUS = {
	PENDING: "pending",
	CONFIRMED: "confirmed",
	CANCELED: "canceled",
	COMPLETED: "completed",
	NO_SHOW: "no_show",
} as const;

export type BookingStatusValue = (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];

// Booking types
export const BOOKING_TYPE = {
	BIRTHDAY: "birthday",
	FOOTBALL: "football",
} as const;

export type BookingTypeValue = (typeof BOOKING_TYPE)[keyof typeof BOOKING_TYPE];

// User roles (aligned with MemberRole type)
export const USER_ROLE = {
	OWNER: "owner",
	ADMIN: "admin",
	MANAGER: "manager",
	STAFF: "staff",
} as const;

export type UserRoleValue = (typeof USER_ROLE)[keyof typeof USER_ROLE];

// Stock status thresholds
export const STOCK_STATUS = {
	OUT: 0,
	LOW: 10, // configurable via settings.low_stock_threshold
} as const;
