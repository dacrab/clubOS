import { sql } from "drizzle-orm";
import { boolean, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { facilities } from "./facilities";
import { tenants } from "./tenants";
import { users } from "./users";

export const memberRole = text("role", {
	enum: ["owner", "admin", "manager", "staff"],
});

export const memberships = pgTable(
	"memberships",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		tenantId: uuid("tenant_id")
			.notNull()
			.references(() => tenants.id, { onDelete: "cascade" }),
		facilityId: uuid("facility_id").references(() => facilities.id, {
			onDelete: "cascade",
		}),
		role: memberRole.notNull().default("staff"),
		isPrimary: boolean("is_primary").notNull().default(false),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => ({
		primaryIdx: uniqueIndex("memberships_unique_primary")
			.on(table.userId)
			.where(sql`is_primary = true`),
		tenantWideIdx: uniqueIndex("memberships_unique_tenant_wide")
			.on(table.userId, table.tenantId)
			.where(sql`facility_id IS NULL`),
		facilitySpecificIdx: uniqueIndex("memberships_unique_facility_specific")
			.on(table.userId, table.tenantId, table.facilityId)
			.where(sql`facility_id IS NOT NULL`),
	}),
);
