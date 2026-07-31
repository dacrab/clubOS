import {
	boolean,
	integer,
	numeric,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
} from "drizzle-orm/pg-core";
import { categories } from "./categories";
import { facilities } from "./facilities";
import { users } from "./users";

export const products = pgTable(
	"products",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		facilityId: uuid("facility_id")
			.notNull()
			.references(() => facilities.id, { onDelete: "cascade" }),
		categoryId: uuid("category_id").references(() => categories.id, {
			onDelete: "set null",
		}),
		name: text("name").notNull(),
		description: text("description"),
		price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
		stockQuantity: integer("stock_quantity").notNull().default(0),
		trackInventory: boolean("track_inventory").notNull().default(true),
		imageUrl: text("image_url"),
		searchVector: text("search_vector"),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
		createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
	},
	(table) => ({
		uniqueName: unique().on(table.facilityId, table.name),
	}),
);
