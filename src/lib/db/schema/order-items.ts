import { boolean, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { money } from "./columns";
import { facilities } from "./facilities";
import { orders } from "./orders";
import { products } from "./products";

export const orderItems = pgTable("order_items", {
	id: uuid("id").primaryKey().defaultRandom(),
	orderId: uuid("order_id")
		.notNull()
		.references(() => orders.id, { onDelete: "cascade" }),
	facilityId: uuid("facility_id")
		.notNull()
		.references(() => facilities.id, { onDelete: "cascade" }),
	productId: uuid("product_id")
		.notNull()
		.references(() => products.id, { onDelete: "restrict" }),
	productName: text("product_name").notNull(),
	quantity: integer("quantity").notNull().default(1),
	unitPrice: money("unit_price").notNull(),
	lineTotal: money("line_total").notNull(),
	isTreat: boolean("is_treat").notNull().default(false),
	isDeleted: boolean("is_deleted").notNull().default(false),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
