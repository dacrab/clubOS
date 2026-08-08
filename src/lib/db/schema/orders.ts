import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { money } from "./columns";
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
	subtotal: money("subtotal").notNull().default(0),
	discountAmount: money("discount_amount").notNull().default(0),
	totalAmount: money("total_amount").notNull().default(0),
	couponCount: integer("coupon_count").notNull().default(0),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	createdBy: text("created_by")
		.notNull()
		.references(() => users.id, { onDelete: "restrict" }),
});
