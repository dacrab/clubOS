import { bigserial, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { users } from "./users";

export const auditLog = pgTable("audit_log", {
	id: bigserial("id", { mode: "bigint" }).primaryKey(),
	tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "set null" }),
	tableName: text("table_name").notNull(),
	recordId: uuid("record_id").notNull(),
	action: text("action").notNull(),
	oldData: jsonb("old_data"),
	newData: jsonb("new_data"),
	changedBy: uuid("changed_by").references(() => users.id, { onDelete: "set null" }),
	changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
});
