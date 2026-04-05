export const BOOKING_STATUS = {
	PENDING: "pending",
	CONFIRMED: "confirmed",
	CANCELED: "canceled",
	COMPLETED: "completed",
	NO_SHOW: "no_show",
} as const;

export type BookingStatusValue = (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];

export const BOOKING_TYPE = {
	BIRTHDAY: "birthday",
	FOOTBALL: "football",
} as const;

export type BookingTypeValue = (typeof BOOKING_TYPE)[keyof typeof BOOKING_TYPE];

export const USER_ROLE = {
	OWNER: "owner",
	ADMIN: "admin",
	MANAGER: "manager",
	STAFF: "staff",
} as const;

export type UserRoleValue = (typeof USER_ROLE)[keyof typeof USER_ROLE];

export const STOCK_STATUS = { OUT: 0, LOW: 10 } as const;

export const PRODUCTS_LIMIT = 500;
export const CATEGORIES_LIMIT = 100;
export const BOOKINGS_LIMIT = 200;
export const ORDERS_LIMIT = 100;
export const DASHBOARD_LIMIT = 5;
export const USERS_PER_PAGE = 200;

export const TRIAL_DAYS = 14;
export const DEFAULT_TIMEZONE = "UTC";
