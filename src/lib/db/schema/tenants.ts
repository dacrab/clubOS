import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { TenantSettings } from "$lib/config/settings";

export const tenants = pgTable("tenants", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: text("name").notNull().unique(),
	slug: text("slug").notNull().unique(),
	settings: jsonb("settings").$type<Partial<TenantSettings>>().notNull().default({}),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
