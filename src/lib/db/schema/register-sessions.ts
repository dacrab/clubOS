import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { money } from "./columns";
import { facilities } from "./facilities";
import { users } from "./users";

export const registerSessions = pgTable("register_sessions", {
	id: uuid("id").primaryKey().defaultRandom(),
	facilityId: uuid("facility_id")
		.notNull()
		.references(() => facilities.id, { onDelete: "cascade" }),
	openedBy: text("opened_by")
		.notNull()
		.references(() => users.id, { onDelete: "restrict" }),
	closedBy: text("closed_by").references(() => users.id, { onDelete: "set null" }),
	openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
	closedAt: timestamp("closed_at", { withTimezone: true }),
	openingCash: money("opening_cash").notNull().default(0),
	closingCash: money("closing_cash"),
	expectedCash: money("expected_cash"),
	notes: text("notes"),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
