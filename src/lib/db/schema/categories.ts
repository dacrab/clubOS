import { pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { facilities } from "./facilities";

export const categories = pgTable(
	"categories",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		facilityId: uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "cascade" }),
		// biome-ignore lint/suspicious/noExplicitAny: Drizzle self-referencing FK pattern
		parentId: uuid("parent_id").references((): any => categories, {
			onDelete: "set null",
		}),
		name: text("name").notNull(),
		description: text("description"),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => ({
		uniqueName: unique().on(table.facilityId, table.name),
	}),
);
