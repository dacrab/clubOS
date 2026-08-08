import { pgEnum } from "drizzle-orm/pg-core";

export const memberRoleEnum = pgEnum("member_role", ["owner", "admin", "manager", "staff"]);

export const bookingTypeEnum = pgEnum("booking_type", ["birthday", "football", "event", "other"]);

export const bookingStatusEnum = pgEnum("booking_status", [
	"pending",
	"confirmed",
	"canceled",
	"completed",
	"no_show",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
	"trialing",
	"active",
	"canceled",
	"past_due",
	"unpaid",
	"paused",
]);
