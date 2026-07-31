import { integer, numeric, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { facilities } from "./facilities";
import { registerSessions } from "./register-sessions";
import { users } from "./users";

export const orders = pgTable("orders", {
	id: uuid("id").primaryKey().defaultRandom(),
	facilityId: uuid("facility_id")
		.notNull()
		.references(() => facilities.id, { onDelete: "cascade" }),
	sessionId: uuid("session_id").references(() => registerSessions.id, {
		onDelete: "set null",
	}),
	subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull().default("0"),
	discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }).notNull().default("0"),
	totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull().default("0"),
	couponCount: integer("coupon_count").notNull().default(0),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	createdBy: uuid("created_by")
		.notNull()
		.references(() => users.id, { onDelete: "restrict" }),
});
