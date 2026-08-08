import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { BookingDetails } from "$lib/types/database";
import { bookingStatusEnum, bookingTypeEnum } from "./enums";
import { facilities } from "./facilities";
import { users } from "./users";

export const bookings = pgTable("bookings", {
	id: uuid("id").primaryKey().defaultRandom(),
	facilityId: uuid("facility_id")
		.notNull()
		.references(() => facilities.id, { onDelete: "cascade" }),
	type: bookingTypeEnum("type").notNull(),
	status: bookingStatusEnum("status").notNull().default("confirmed"),
	customerName: text("customer_name").notNull(),
	customerPhone: text("customer_phone"),
	customerEmail: text("customer_email"),
	startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
	endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
	details: jsonb("details").$type<BookingDetails>().notNull().default({}),
	notes: text("notes"),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	createdBy: text("created_by")
		.notNull()
		.references(() => users.id, { onDelete: "restrict" }),
});
