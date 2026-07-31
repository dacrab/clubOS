import { pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

export const facilities = pgTable(
	"facilities",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		tenantId: uuid("tenant_id")
			.notNull()
			.references(() => tenants.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		address: text("address"),
		phone: text("phone"),
		email: text("email"),
		timezone: text("timezone").notNull().default("Europe/Athens"),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => ({
		uniqueName: unique().on(table.tenantId, table.name),
	}),
);
