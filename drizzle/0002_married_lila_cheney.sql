ALTER TABLE "audit_log" ALTER COLUMN "changed_by" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "created_by" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "memberships" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "created_by" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "register_sessions" ALTER COLUMN "opened_by" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "register_sessions" ALTER COLUMN "closed_by" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "created_by" SET DATA TYPE text;