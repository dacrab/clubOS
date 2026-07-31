import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { facilities } from "./facilities";
import { users } from "./users";

export const bookings = pgTable("bookings", {
	id: uuid("id").primaryKey().defaultRandom(),
	facilityId: uuid("facility_id")
		.notNull()
		.references(() => facilities.id, { onDelete: "cascade" }),
	type: text("type", { enum: ["birthday", "football", "event", "other"] }).notNull(),
	status: text("status", {
		enum: ["pending", "confirmed", "canceled", "completed", "no_show"],
	})
		.notNull()
		.default("confirmed"),
	customerName: text("customer_name").notNull(),
	customerPhone: text("customer_phone"),
	customerEmail: text("customer_email"),
	startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
	endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
	details: jsonb("details").notNull().default({}),
	notes: text("notes"),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	createdBy: uuid("created_by")
		.notNull()
		.references(() => users.id, { onDelete: "restrict" }),
});
