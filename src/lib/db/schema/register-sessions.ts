import { numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { facilities } from "./facilities";
import { users } from "./users";

export const registerSessions = pgTable("register_sessions", {
	id: uuid("id").primaryKey().defaultRandom(),
	facilityId: uuid("facility_id")
		.notNull()
		.references(() => facilities.id, { onDelete: "cascade" }),
	openedBy: uuid("opened_by")
		.notNull()
		.references(() => users.id, { onDelete: "restrict" }),
	closedBy: uuid("closed_by").references(() => users.id, { onDelete: "set null" }),
	openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
	closedAt: timestamp("closed_at", { withTimezone: true }),
	openingCash: numeric("opening_cash", { precision: 10, scale: 2 }).notNull().default("0"),
	closingCash: numeric("closing_cash", { precision: 10, scale: 2 }),
	expectedCash: numeric("expected_cash", { precision: 10, scale: 2 }),
	notes: text("notes"),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
