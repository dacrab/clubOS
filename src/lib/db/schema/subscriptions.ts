import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

export const subscriptionStatus = text("status", {
	enum: ["trialing", "active", "canceled", "past_due", "unpaid", "paused"],
});

export const subscriptions = pgTable("subscriptions", {
	id: uuid("id").primaryKey().defaultRandom(),
	tenantId: uuid("tenant_id")
		.notNull()
		.unique()
		.references(() => tenants.id, { onDelete: "cascade" }),
	polarCustomerId: text("polar_customer_id"),
	polarSubscriptionId: text("polar_subscription_id").unique(),
	status: subscriptionStatus.notNull().default("trialing"),
	planName: text("plan_name"),
	currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
	trialEnd: timestamp("trial_end", { withTimezone: true }),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
